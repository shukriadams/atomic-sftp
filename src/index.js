(async ()=>{
    const minimist = require('minimist'),
        process = require('process'),
        fsUtils = require('madscience-fsUtils'),
        path = require('path'),
        fs = require('fs-extra'),
        argv = minimist(process.argv.slice(2)),
        source = argv.source || argv.s,
        target = argv.target || argv.t,
        host = argv.target || argv.h,
        user = argv.user || argv.u,
        port = argv.port,
        password = argv.password || argv.p,
        ssh = require('./lib/ssh'),
        sftp = require('./lib/sftp')

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
    
    console.log('found local files', sourceFiles)
    const regex = /Modify: (.*)/gm
    for (let file of sourceFiles){
        // get timestamp of local

        let fileStats,
            localModifyTime
        try {
            fileStats = fs.statSync(file)
            localModifyTime = new Date(fileStats.mtime)

        } catch (ex){
            console.log(`failed to get stats of local file ${file}`)
            throw ex
        }

        // get timestamp for remote
        const localPath = path.resolve(file)
        let remotePath = localPath.replace(sourceAbsolute, '')
        remotePath = path.join(target, remotePath)
        let stat,
            pushFile = false

        try {
            stat = await ssh(host, user, password, `stat ${remotePath}`)
        } catch(ex){
            if (ex.includes('cannot stat'))
                pushFile = true
            else
                throw ex
        }

        if (stat){
            let modifytime = regex.exec(stat)
            if (modifytime && modifytime.length > 0){
                modifytime = new Date(modifytime[1])

                if (localModifyTime > modifytime)
                    pushFile = true
            }
        }

        if (!pushFile){
            console.log(`skipping ${localPath}`)
            continue
        }

        try {
            await sftp(host, user, password, localPath, remotePath)
            console.log(`put file ${localPath}`)
            // look for 'cannot stat' for file not found
            // line with 'Modify: 2022-11-22 11:09:47.087220971 +0100' for modify time
         }catch(ex){
            console.log(`failed to process file ${file}:`)
            console.log(ex)
            process.exit(1)
        }
    }

})()
