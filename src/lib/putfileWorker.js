const { parentPort } = require('worker_threads'),
    process = require('process'),
    sftp = require('./sftp'),
    path = require('path'),
    ssh = require('./ssh'),
    fsUtils = require('madscience-fsUtils'),
    regex = /Modify: (.*)/gm,
    { v4: uuidv4 } = require('uuid'),
    fs = require('fs-extra')

parentPort.once('message', async (args) => {
    
    const file = args.file,
        sourceAbsolute = args.sourceAbsolute,
        host = args.host,
        target = args.target,
        verbose = args.verbose,
        user = args.user, 
        port = args.port,
        password = args.password

    // do work
    try {
        
        // get timestamp of local
        let fileStats,
            localModifyTime
        try {
            fileStats = fs.statSync(file)
            localModifyTime = new Date(fileStats.mtime)

        } catch (ex){
            console.log(`failed to get stats for local file ${file}`)
            throw ex
        }

        // get timestamp for remote
        const localPath = path.resolve(file)
        let remotePath = localPath.replace(sourceAbsolute, '')
        remotePath = path.join(target, remotePath)
        remotePath = fsUtils.toUnixPath(remotePath)

        let stat,
            pushFile = false

        try {
            stat = await ssh(host, user, password, `stat ${remotePath}`, port)
        } catch(ex){
            // look for 'cannot stat' for file not found
            // on windows, stat on non-existent file throws ex too
            if (ex.includes('cannot stat') || (process.platform === 'win32' && ex === 'stat: ')){
                if (verbose)
                    console.log(`file "${remotePath}" not found on remote, will push.`)
                pushFile = true
            }
            else
                throw ex
            
        }

        if (stat){
            let modifytime = regex.exec(stat)
            if (modifytime && modifytime.length > 0){
                modifytime = new Date(modifytime[1])

                if (localModifyTime > modifytime){
                    if (verbose)
                        console.log(`Local file "${sourceAbsolute}"" is newer(${localModifyTime} vs ${modifytime}), will upload`)
                    pushFile = true
                }
            }
        }

        if (!pushFile){
            if (verbose)
                console.log(`Skipping ${localPath}`)
            return parentPort.postMessage({
                success : true,
            })
    
        }

        let tempRemotePath = path.join(path.dirname(remotePath), `~${path.basename(remotePath)}_${uuidv4()}`)
        tempRemotePath = fsUtils.toUnixPath(tempRemotePath)
        
        try {
            await sftp.putFile(host, user, password, localPath, tempRemotePath, port)
            await sftp.deleteFile(host, user, password, remotePath, port)
            await sftp.moveFile(host, user, password, tempRemotePath, remotePath, port)
            if (verbose)
                console.log(`Successfully put file ${localPath}`)
            
            return parentPort.postMessage({
                success : true,
                uploaded : true
            })

         }catch(ex){
            console.log(`failed to process file ${file}:`)
            console.log(ex)

            return parentPort.postMessage({
                success : false,
                error : ex
            })
        }

    }catch(ex){
        console.log(`error uploading file dir ${args.file}`)

        return parentPort.postMessage({
            success : false,
            error : ex
        })
    }

})
        