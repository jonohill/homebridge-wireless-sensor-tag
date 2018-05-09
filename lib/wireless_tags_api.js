var request = require('request');

var makeRequest = function(path, body, token, callback) {
    request({
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
    }, function (error, response, body) {
        if (!error) {
            callback(body.d);
        } 
        else {
            callback(false);
        }
    });    
}

var wirelesstags = {
    // Forms a valid request to get the latest tag list.
    getTagList: function(token, callback) {
        makeRequest('GetTagList2', {}, token, callback);
    },
    loadTempSensorConfig: function(tagId, token, callback) {
        makeRequest('LoadTempSensorConfig', { id: tagId }, token, callback);
    }
};

module.exports = wirelesstags;
