(async ()=>{
    const minimist = require('minimist'),
        process = require('process'),
        fsUtils = require('madscience-fsUtils'),
        path = require('path'),
        fs = require('fs-extra'),
        timebelt = require('timebelt'),
        Worker = require('worker_threads').Worker,
        argv = minimist(process.argv.slice(2)),
        source = argv.source || argv.s,
        target = argv.target || argv.t,
        host = argv.target || argv.h,
        user = argv.user || argv.u,
        port = argv.port || 22,
        maxWorkers = argv.workers || argv.w || 10,
        password = argv.password || argv.p

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

    const isFile = !fs.lstatSync(source).isDirectory(),
        sourceAbsolute = path.resolve(source)

    let sourceFiles = []
    if (isFile)
        sourceFiles.push(source)
    else 
        sourceFiles = await fsUtils.readFilesUnderDir(source)
    
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

            const worker = new Worker('./lib/mkdirWorker.js'),
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
    while(workerCount)await timebelt.pause(10)

    console.log('done creating dirs, processing files')

    workerCount = 0
    
    while (sourceFiles.length){
        if (workerCount < maxWorkers){

            const worker = new Worker('./lib/putfileWorker.js'),
                file = sourceFiles.pop()

            worker.postMessage({
                file,
                host,
                user,
                password,
                port,
                sourceAbsolute,
                target
            })
            workerCount ++
            console.log(`Processing files ${sourceFiles.length} left :: ${file} `)

            worker.on('message', (result) => {
                workerCount --
                if (!result.success)
                    console.log(result.error)
            })
        } 
        
        await timebelt.pause(10)
    }

    // wait for threads
    while(workerCount)await timebelt.pause(10)

    
    console.log('done!')
})()
