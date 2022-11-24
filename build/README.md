## Windows build

To build standalone binaries for windows

- install git
- install bash, or use git's version by adding <your-git-install>/usr/bin to your windows PATH env var
- install nodejs 12.x
- install pkg

        npm install pkg@4.5.1 -g


- `cd build`
- run the build script

        sh build.sh --arch win64

- your binary will be placed in build/win64