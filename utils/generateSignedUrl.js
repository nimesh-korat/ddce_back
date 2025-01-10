const { getSignedUrl } = require("@aws-sdk/cloudfront-signer");

function generateSignedUrl(url, dateLessThan) {
    const keyPairId = process.env.AWS_KEY_PAIR_ID;
    const privateKey = process.env.AWS_PRIVATE_KEY;

    const signedUrl = getSignedUrl({
        url: url,
        dateLessThan: dateLessThan,
        keyPairId: keyPairId,
        privateKey: privateKey
    });

    return signedUrl;

}

module.exports = { generateSignedUrl };