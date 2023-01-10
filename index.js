#!/usr/bin/env node
console.log("############################");
console.log("#         WELCOME          #");
console.log("# wp-plugin-deploy v" + require("./package.json").version + "  #");
console.log("# Author: @sammosna        #");
console.log("############################");

// git add . && git commit -m "wip: wp deploy" && pnpm version patch && node deploy.js
const inquirer = require("inquirer");
const { execSync, exec } = require("child_process");
const {
  writeFileSync,
  readFileSync,
  unlinkSync,
  copyFileSync,
  mkdirSync,
  createWriteStream,
} = require("fs");
const ftp = require("basic-ftp");
const archiver = require("archiver");

const path = require("path");

let info, pj

const execOpts = {
    cwd: process.cwd()
}

try {
    const infoFile = readFileSync(path.resolve(process.cwd(), 'info.json'), "utf8");
    info = JSON.parse(infoFile);
} catch (e) {
    throw new Error("info.json not found");
}

try {
    const packageFile = readFileSync(path.resolve(process.cwd(), 'package.json'), "utf8");
    pj = JSON.parse(packageFile);
} catch (e) {
    throw new Error("package.json not found");
}


(async () => {
  if (
    !process.env.WP_UPDATER_SERVER_BASE ||
    !process.env.WP_UPDATER_FTP_PASS ||
    !process.env.WP_UPDATER_FTP_USER ||
    !process.env.WP_UPDATER_FTP_HOST
  )
    throw new Error(
      "Missing FTP credentials. Please set env vars WP_UPDATER_SERVER_BASE, WP_UPDATER_FTP_PASS, WP_UPDATER_FTP_USER and WP_UPDATER_FTP_HOST"
    );

  /**
   * SETUP
   */

  const { update } = await inquirer.prompt([
    {
      type: "list",
      name: "update",
      message: "What type of update?",
      choices: ["Patch", "Minor", "Major"],
      filter(val) {
        return val.toLowerCase();
      },
    },
  ]);

  try {
    console.log("Updating version...");
    execSync(`git add .`, execOpts);
    execSync(`git commit -m "update: commit before update"`, execOpts);
    execSync(`pnpm version ${update}`, execOpts);
    process.exit()
  } catch (e) {}

  const NAME = pj.name;
  const ZIP = `${NAME}.zip`;

  // if (info.version === package.version)
  //   throw new Error(
  //     "Version is the same as the previous one. please run `pnpm version patch/minor/major`"
  //   );

  /**
   * BUILD
   */
  console.log("Building...");

  const build = execSync("pnpm run build", execOpts);
  // console.log(build.toString());

  /**
   * INFO
   */

  info.version = pj.version;
  info.slug = NAME;
  info.download_url = path.join(process.env.WP_UPDATER_SERVER_BASE, NAME, ZIP);
  info.last_updated = new Date().toISOString();
  writeFileSync("./info.json", JSON.stringify(info, null, 2));

  /**
   * PLUGIN INDEX
   */
  const pluginIndex = readFileSync(`./${NAME}.php`, "utf8");
  if (!/Version: [0-9].[0-9].[0-9]*/.test(pluginIndex)) {
    throw new Error("Version not found in php file");
  }
  writeFileSync(
    `./${NAME}.php`,
    pluginIndex.replace(
      /Version: [0-9].[0-9].[0-9]*/,
      `Version: ${pj.version}`
    ),
    "utf8"
  );

  /**
   * ZIP
   */

  // unlinkSync(ZIP);
  const output = createWriteStream(ZIP);
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Sets the compression level.
  });

  archive.pipe(output);
  archive.directory(`build`, `${NAME}/build`);
  archive.directory(`inc`, `${NAME}/inc`);
  archive.file(`${NAME}.php`, { name: `${NAME}/${NAME}.php` });
  archive.finalize();
  // const zip = execSync("pnpm wp-scripts plugin-zip", execOpts);
  // console.log("zip", zip.toString());

  /**
   * UPLOAD
   */

  console.log("Uploading...");

  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host: process.env.WP_UPDATER_FTP_HOST,
      user: process.env.WP_UPDATER_FTP_USER,
      password: process.env.WP_UPDATER_FTP_PASS,
      secure: false,
    });

    await client.cd("/");
    await client.ensureDir(`/${NAME}/`);
    await client.cd(`/${NAME}/`);

    await client.uploadFrom(ZIP, ZIP);
    await client.uploadFrom("info.json", "info.json");
  } catch (err) {
    console.log(err);
  }
  client.close();

  /**
   * GIT
   */
  execSync(`git add .`, execOpts);
  execSync(`git commit -m "update: ${NAME} ${pj.version}"`, execOpts);
})();