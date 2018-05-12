var request = require('request-promise');

var makeRequest = async function(path, body, token) {
    try {
        let response = await request({
            method: 'POST',
            baseUrl: 'https://www.mytaglist.com/ethClient.asmx/',
            uri: path,
            json: true,
            jar: true,
            gzip: true,
            headers: {
            'Authorization': 'Bearer ' + token
            },
            body: body
        });
        return response.d;
    } catch (err) {
        return false;
    }
}

var wirelesstags = {
    // Forms a valid request to get the latest tag list.
    getTagList: function(token) {
        return makeRequest('GetTagList2', {}, token);
    },
    loadTempSensorConfig: function(tagId, token) {
        return makeRequest('LoadTempSensorConfig', { id: tagId }, token);
    }
};

module.exports = wirelesstags;
