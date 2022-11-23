# atomic-sftp

Command line utility to SFTP files. Files appear in target location only after upload complete. 

## Use

atomic-sftp -s path/to/upload -t /remote/path -h <remote-address> -u <remote-user> -p <remote-password> -w <number-of-parallel-upload-processes>