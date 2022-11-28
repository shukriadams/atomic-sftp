(async ()=>{
    try  {
        const minimist = require('minimist'),
            process = require('process'),
            fsUtils = require('madscience-fsUtils'),
            path = require('path'),
            fs = require('fs-extra'),
            timebelt = require('timebelt'),
            Worker = require('worker_threads').Worker,
            // must require so pkg can bundle, require in worker class doesn't get picked up
            sftp = require('./lib/sftp'),
            // must require so pkg can bundle, require in worker class doesn't get picked up
            ssh = require('./lib/ssh'),
            argv = minimist(process.argv.slice(2)),
            source = argv.source || argv.s,
            target = argv.target || argv.t,
            verbose = argv.verbose !== undefined || argv.V !== undefined,
            host = argv.target || argv.h,
            user = argv.user || argv.u,
            port = argv.port || 22,
            maxWorkers = argv.workers || argv.w || 10,
            password = argv.password || argv.p
            
        if (argv.version || argv.v){
            const package = await fs.readJson(path.join( __dirname, '/package.json'))
            console.log(`atomic-sftp, version ${package.version}`)
            process.exit(0)
        }

        if (!source){
            console.log(`ERROR :  Source not set, use --source or -s`)
            return process.exit(1)
        }

        if (!target){
            console.log(`ERROR :  Source not set, use --target or -t`)
            return process.exit(1)
        }

        if (!host){
            console.log(`ERROR : Target not set, use --host or -h`)
            return process.exit(1)
        }

        if (!password){
            console.log(`ERROR : Target not set, use --password or -p`)
            return process.exit(1)
        }

        if (!user){
            console.log(`ERROR : Target not set, use --user or -u`)
            return process.exit(1)
        }

        if (!await fs.exists(source)){
            console.log(`ERROR : Source path ${source} does not exist`)
            return process.exit(1)
        }

        let isFile = !fs.lstatSync(source).isDirectory(),
            startTime = new Date(),
            sourceAbsolute = path.resolve(source),
            sourceFiles = []

        if (isFile)
            sourceFiles.push(source)
        else 
            sourceFiles = await fsUtils.readFilesUnderDir(source)
        
        console.log(`Putting files. Threads : ${maxWorkers}. ${verbose? 'Verbose is on': ''}`)

        // line with 'Modify: 2022-11-22 11:09:47.087220971 +0100' for modify time

        // create remote directories, sftp doesn't support automatic dir create on upload, and
        // we want to avoid round tripping to the server per file, so we locally collate all unique
        // dirs and create them first
        let uniqueDirs = []
        for (let file of sourceFiles){
            const localPath = path.resolve(file)
            let remotePath = localPath.replace(sourceAbsolute, '')
            remotePath = path.join(target, remotePath)
            remotePath = path.dirname(remotePath)

            if (!uniqueDirs.includes(remotePath))
                uniqueDirs.push(remotePath)
        }

        let workerCount = 0
        while (uniqueDirs.length){
            if (workerCount < maxWorkers){
                // pkg builds require absolute path to load workers                
                const worker = new Worker(path.join(__dirname, 'lib/mkdirWorker.js')),
                    uniqueDir = uniqueDirs.pop()
                
                worker.postMessage({
                    uniqueDir,
                    host,
                    user,
                    port,
                    password,
                })
                workerCount ++
                console.log(`Ensuring dirs ${uniqueDirs.length} left :: ${uniqueDir} `)

                worker.on('message', (result) => {
                    workerCount --
                    if (!result.success)
                        console.log(result.error)
                })
            } 
        
            await timebelt.pause(10)
        }

        // wait for threads
        while(workerCount)
            await timebelt.pause(10)

        console.log('done creating dirs, processing files')
       
        workerCount = 0
        let processedFileCount = sourceFiles.length,
            uploadedFileCount = 0

        while (sourceFiles.length){
            if (workerCount < maxWorkers){
                // pkg builds require absolute path to load workers
                const worker = new Worker(path.join(__dirname, 'lib/putfileWorker.js')),
                    file = sourceFiles.pop()

                worker.postMessage({
                    file,
                    host,
                    user,
                    password,
                    port,
                    sourceAbsolute,
                    target,
                    verbose
                })
                workerCount ++
                console.log(`Processing files ${sourceFiles.length} left :: ${file} `)

                worker.on('message', (result) => {
                    workerCount --

                    if (result.uploaded)
                        uploadedFileCount ++

                    if (!result.success)
                        console.log(result.error)
                })
            } 
            
            await timebelt.pause(10)
        }

        // wait for threads
        while(workerCount)
            await timebelt.pause(10)
        
        console.log(`Processed ${processedFileCount}, uploaded ${uploadedFileCount} files in ${timebelt.timespanStringPlural(new Date(), startTime)}`)
    } 
    catch(ex) 
    {
        console.log('Unexpected error ', ex)
    }

})()
