const update = (string = "1.0.0", up) => {
    const [maj, min, pat] = string.split(".")
    switch (up) {
        case "major":
            console.log(string, "->", `${parseInt(maj) + 1}.0.0`);
            return `${parseInt(maj) + 1}.0.0`
        case "minor":
            console.log(string, "->", `${maj}.${parseInt(min) + 1}.0`);
            return `${maj}.${parseInt(min) + 1}.0`
        case "patch":
            console.log(string, "->", `${maj}.${min}.${parseInt(pat) + 1}`);
            return `${maj}.${min}.${parseInt(pat) + 1}`
        default:
            return string
    }
}


module.exports = {
    update
}