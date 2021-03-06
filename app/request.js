'use strict';

let configHandler = require('./config.js'),
    request = require('request'),
    shared = require('./shared.js');

function send (data) {

    let config = configHandler.getConfig();

    // Make sure we conform to whatever the API expects
    data.motionEvent = false;
    data.outsideTemperature = data.temperature;
    data.outsidePressure = data.pressure;
    data.outsideHumidity = data.humidity;
    data.outsideAltitude = data.altitude;

    // Extend data with place id
    data.placeId =  config.placeId;
    
    // Add IDs for all added wifi networks
    data.wifiNetworks = config.wifiNetworks.map(item => {
        return item.Id;
    });

    // Pass on the app version for possible update
    data.appVersion = config.appVersion;

    // Setup request
    var options = {
        uri: config.logPath,
        method: 'POST',
        gzip: true,
        json: data,
        timeout: 60 * 5 * 1000
    };

    // Keep track of attempts
    let attempts = 0;

    return new Promise((resolve, reject) => {
        (function attemptToSendRequest () {
            attempts++;

            console.log(`Request started ${new Date()}`);
            request(options, function (error, httpResponse, body) {
                
                // Request completed (200) and no error occured at API
                if (!error && httpResponse && httpResponse.statusCode == 200 && body && body.success) {
                    resolve(body);
                }
                // Request/API failed
                else {
                    console.log(`Request attempt ${attempts} failed ("${error}").`);

                    // If we reach 10 failed attempts, then we will do a reboot
                    // This might indicate that the 3G card has stopped working
                    if (attempts > 10) {
                        console.log(`Rebooting...`);
                        shared.reboot();
                    }
                    else {

                        console.log(`Trying again.`);

                        // If we reach 5 failed attempts, lets wait for 1 minute before trying again
                        else if (attempts === 5) {
                            setTimeout(attemptToSendRequest, 1000 * 60);
                        }
                        else {
                            attemptToSendRequest();
                        }
                    }
                }
            });
        }());
    });
}

module.exports = {
    send
};