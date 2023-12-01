const { toResOfType } = require("../resource-utilities");

const toResUrl = toResOfType('url');
const toResHtml = toResOfType('html');
const toResImage = toResOfType('image');

module.exports = {
    toResUrl,
    toResHtml,
    toResImage
}