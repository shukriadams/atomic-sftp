module.exports = async(host, username, password, localPath, remotePath, port=22)=>{

    return new Promise((resolve, reject)=>{
        try{
            const Client = require('ssh2-sftp-client'),
                fs = require('fs-extra')

            const config = {
                host: host,
                port: port,
                username: username,
                password: password
            }
            
            let sftp = new Client
            let data = fs.createReadStream(localPath)

            sftp.connect(config)
                .then(() => {
                    return sftp.put(data, remotePath)
                })
                .then(() => {
                    sftp.end()
                    resolve()
                })
                .catch(err => {
                    reject(err)
                })

        } catch (ex){
            reject(ex)
        }
    })
    
}