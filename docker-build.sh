#!/bin/bash

args=$@

if [ -z "$args" ]; then
    echo "Command arguments are missing."
    echo "Usage: ./docker-build.sh <command>"
    echo "Example: ./docker-build.sh npm run build-firefox"
    exit
fi

mkdir logs || echo "Ignore"
rm -rf node_modules
rm -rf dist

#docker rmi -f tab-master-5000-build-env:latest -f
docker build -t tab-master-5000-build-env . || echo ""

# Kill the container on exit in case of an interruption
cleanUp() {
  printf "\n\nInterrupted, killing container\n\n"
  exec docker kill $id
  rm $logPath
  trap - EXIT
}

trap cleanUp SIGINT

# Unix timestamps
ts=$(date "+%s")
# Get the current shorthand commit hash
commit=$(git log --pretty=format:'%h' -n 1)
# Runs the container detached, bind mounts to the current directory,
# and run the npm scripts in a shell. assigns the container hash to $id.
# Then installs node modules and runs the command arguments of this script.
id=$(docker run -it -d -e COMMIT_HASH=$commit -v $(pwd):/tm5k tab-master-5000-build-env /bin/sh -c "npm install && $args")
logPath=./logs/build-$commit-$ts.log

echo "Container: $id"

docker logs -f $id 2>&1 | tee -a $logPath

# Remove color code artifacts and resulting empty lines from the log file
echo $(cat $logPath | sed -r 's/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]//g' | sed -r '/^\s*$/d') > $logPath
