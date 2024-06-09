unique_name=${2//[^[:alnum:]_]/}
zipname="${unique_name}.zip"
mkdir "$unique_name"
curl -LO $1 --output "$unique_name"
echo "${unique_name}/signedlogcontent*"
echo "${unique_name}/${zipname}"
# mv "${unique_name}/signedlogcontent*" "${unique_name}/${zipname}"
# unzip $zipname
# rm $zipname
