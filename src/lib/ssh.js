module.exports = async(host, user, password, command)=>{
    const SSH = require('simple-ssh')

    const ssh = new SSH({
        host: host,
        user: user,
        pass: password
    })

    return new Promise((resolve, reject)=>{
        try {
            ssh.exec(command, {

                out: stdout => {
                    resolve(stdout)
                },

                err: stderr => {
                    reject(stderr)   
                }                

            }).start()

        }catch(ex){
            reject(ex)
        }
    })
}
