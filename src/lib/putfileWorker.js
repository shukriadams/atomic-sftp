const { parentPort } = require('worker_threads'),
    sftp = require('./sftp'),
    path = require('path'),
    ssh = require('./ssh'),
    regex = /Modify: (.*)/gm,
    fs = require('fs-extra')

parentPort.once('message', async (args) => {
    
    const file = args.file,
        sourceAbsolute = args.sourceAbsolute,
        host = args.host,
        target = args.target,
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
            stat = await ssh(host, user, password, `stat ${remotePath}`, port)
        } catch(ex){
            // look for 'cannot stat' for file not found
            if (ex.includes('cannot stat')){
                pushFile = true
                console.log('file doesnt exist remote')
            }
            else
                throw ex
        }

        if (stat){
            let modifytime = regex.exec(stat)
            if (modifytime && modifytime.length > 0){
                modifytime = new Date(modifytime[1])

                if (localModifyTime > modifytime){
                    console.log(localModifyTime, ' newer than ', modifytime)
                    pushFile = true
                }
            }
        }

        if (!pushFile){
            // console.log(`skipping ${localPath}`)
            return parentPort.postMessage({
                success : true
            })
    
        }

        let tempRemotePath = path.join(path.dirname(remotePath), `~${path.basename(remotePath)}`)

        try {
            await sftp.putFile(host, user, password, localPath, tempRemotePath, port)
            await sftp.deleteFile(host, user, password, remotePath, port)
            await sftp.moveFile(host, user, password, tempRemotePath, remotePath, port)
            console.log(`put file ${localPath}`)
            
            return parentPort.postMessage({
                success : true
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
        