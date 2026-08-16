#!/bin/bash

docker build . -t 188.34.177.197:32000/tcg-calendar-app-downloads:latest
docker push 188.34.177.197:32000/tcg-calendar-app-downloads:latest
