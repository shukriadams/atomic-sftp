module.exports = {
    async mkdir(host, username, password, path, port=22){

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
    
                sftp.connect(config)
                    .then(() => {
                        return sftp.mkdir(path, true)
                    })
                    .then(() => {
                        sftp.end()
                        resolve()
                    })
                    .catch(err => {
                        sftp.end()
                        reject(err)
                    })
    
            } catch (ex){
                reject(ex)
            }
        })
    },

    async deleteFile(host, username, password, path, port=22){
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
    
                sftp.connect(config)
                    .then(() => {
                        return sftp.delete(path)
                    })
                    .then(() => {
                        sftp.end()
                        resolve()
                    })
                    .catch(err => {
                        sftp.end()
                        if (err.message && err.message.includes('No such file'))
                            return resolve()

                        reject(err)
                    })
    
            } catch (ex){
                reject(ex)
            }
        })
    },

    async moveFile(host, username, password, tempPath, remotePath, port=22){
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
    
                sftp.connect(config)
                    .then(() => {
                        return sftp.rename(tempPath, remotePath)
                    })
                    .then(() => {
                        sftp.end()
                        resolve()
                    })
                    .catch(err => {
                        sftp.end()
                        reject(err)
                    })
    
            } catch (ex){
                reject(ex)
            }
        })
    },

    async putFile(host, username, password, localPath, remotePath, port=22){

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
                        sftp.end()
                        reject(err)
                    })
    
            } catch (ex){
                reject(ex)
            }
        })
        
    }
}