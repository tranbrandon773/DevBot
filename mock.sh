#!/bin/bash

unique_name=${2//[^[:alnum:]_]/}
zipname="${unique_name}.zip"
rm -rf "$unique_name"
mkdir "$unique_name"
curl $1 -L -o "${unique_name}/${zipname}"
echo "${unique_name}/${zipname}"
unzip "${unique_name}/${zipname}" -d "$unique_name"