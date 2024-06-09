import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export function runShell(link, newName)
{
    // Convert to ES module path resolution
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Define the shell script to run
    const shellScript = `${__dirname}/fetchLog.sh "${link}" ${newName}`; // Adjust path if necessary

    // Execute the shell script
    execSync(shellScript, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`Script stderr: ${stderr}`);
            return;
        }
        // console.log(`Script output: ${stdout}`);
    });
}


export function runShellPost(newName)
{
    // Convert to ES module path resolution
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Define the shell script to run
    const shellScript = `${__dirname}/postrun.sh ${newName}`; // Adjust path if necessary

    // Execute the shell script
    execSync(shellScript, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`Script stderr: ${stderr}`);
            return;
        }
        // console.log(`Script output: ${stdout}`);
    });
}
