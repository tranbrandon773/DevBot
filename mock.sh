unique_name=${2//[^[:alnum:]_]/}
zipname="${unique_name}.zip"
mkdir "$unique_name"
cd "$unique_name"
curl -LO $1
echo $zipname
mv signedlogcontent* $zipname
unzip $zipname
rm $zipname
cd ..
