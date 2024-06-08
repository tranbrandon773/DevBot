ls
echo $1
echo $2
echo $1
curl -LO $1
uniquename = "$2.zip"
mv signedlogcontent "$uniquename"
unzip "$uniquename" 
run.sh
