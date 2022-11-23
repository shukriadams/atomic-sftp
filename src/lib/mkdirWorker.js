const { parentPort } = require('worker_threads'),
    sftp = require('./sftp')

    
parentPort.once('message', async (args) => {
    // do work
 
    try {
        await sftp.mkdir(args.host, args.user, args.password, args.uniqueDir, args.port)

        return parentPort.postMessage({
            success : true
        })

    }catch(ex){
        console.log(`error creating dir ${args.uniqueDir}`)

        return parentPort.postMessage({
            success : false,
            error : ex
        })
    }

})
