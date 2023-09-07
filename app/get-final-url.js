const axios = require('axios');

module.exports.getFinalUrl = async function getFinalUrl(url, redirectCount = 0) {
    const MAX_REDIRECT = 10;

    try {
        const response = await axios.head(url, {
            maxRedirects: 0, // disable built-in redirects
            validateStatus: status => {
                // only consider 2xx and 3xx valid responses
                return (status >= 200 && status < 400);
            }
        });

        const status = response.status;

        if (status >= 200 && status < 300) {
            return response.config.url; // Return the final URL
        } else if (status >= 300 && status <= 399) {
            const redirectUrl = response.headers.location;
            if(!redirectUrl) {
                throw new Error(`Missing location in http header with status ${status}.`);
            }
            if(redirectCount > MAX_REDIRECT) {
                throw new Error(`Max redirect count reached ${MAX_REDIRECT}.`);
            }
            return await getFinalUrl(redirectUrl, redirectCount + 1); // Recursively follow the redirect
        } else {
            throw new Error(`Unexpected status code: ${status}`);
        }
    } catch (error) {
        if (error.response && error.response.status >= 300 && error.response.status < 400) {
            // In case of redirect, recursively call getFinalUrl
            return await getFinalUrl(error.response.headers.location);
        } else {
            throw new Error(`Error fetching URL: ${error.message}`);
        }
    }
}