var wirelesstags = require('./lib/wireless_tags_api');

var Service, Characteristic, Accessory;

var WirelessTagAccessory;

// Handle registration with homebridge
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;

    WirelessTagAccessory = require('./accessories/wireless_tag')(Accessory, Service, Characteristic);

    homebridge.registerPlatform("homebridge-wireless-sensor-tag", "wireless-sensor-tag", WirelessTagPlatform);
}

// Platform object for the wireless tags. Represents the wireless tag manager
function WirelessTagPlatform(log, config) {
    this.token = config.token;
    this.queryFrequency = config.queryFrequency;
    this.log = log;
    this.motionSensors = (config.motionSensors == undefined) ? [] : config.motionSensors;
    this.contactSensors = (config.contactSensors == undefined) ? [] : config.contactSensors;
    this.emulateThermostats = (config.emulateThermostats == undefined) ? [] : config.emulateThermostats;
}

WirelessTagPlatform.prototype = {
    reloadData: function (callback) {
        var that = this;
        
        (async function() {
            var foundAccessories = [];
            let devices = await wirelesstags.getTagList(this.token);
            if (devices && devices instanceof Array) {
                for (var i = 0; i < devices.length; i++) {
                    var device = devices[i];
                    var config = {};
                    var accessory = undefined;
                    var emulateThermostat = that.emulateThermostats.indexOf(device.name) >= 0;
    
                    if (emulateThermostat) {
                        // Supplement additional config data
                        config = await wirelesstags.loadTempSensorConfig(device.slaveId, that.token);
                        if (!config) {
                            that.log("loadTempSensorConfig - error getting tag config for " + device.uuid);
                            config = {};
                        }
                    }          
    
                    // Device already added, so just load data
                    if (that.deviceLookup[device.uuid]) {
                        accessory = that.deviceLookup[device.uuid];
                        accessory.device = device;
                        accessory.config = config;
                        accessory.loadData();
                    }
                    else {
                        accessory = new WirelessTagAccessory(that, device, config, {
                            motionSensor: that.motionSensors.indexOf(device.name) >= 0,
                            contactSensor: that.contactSensors.indexOf(device.name) >= 0,
                            emulateThermostat: emulateThermostat
                        });
    
                        // Device successfully added
                        if (accessory !== undefined) {
                            that.log("Device added - " + device.uuid);
                            that.deviceLookup[device.uuid] = accessory;
                            foundAccessories.push(accessory);
                        }
                        // Unknown device - skip
                        else {
                            that.log("Device skipped - " + device.uuid);
                        }
                    }
                }
            }
            else {
                that.log("getTagList - error getting tag list");
            }
            return foundAccessories;

        })()
        .then(result => {
            if (callback) {
                callback(result);
            }
        });

    },
    accessories: function (callback) {
        this.log("Fetching Wireless Tags");
        var that = this;
        var foundAccessories = [];
        this.deviceLookup = [];

        this.reloadData(function (foundAccessories) {
            callback(foundAccessories);
        });

        if (that.queryFrequency === undefined || that.queryFrequency < 5000) {
            that.log('Invalid query frequency; setting to 20000ms default');
            that.queryFrequency = 20000;
        }
        else {
            setInterval(that.reloadData.bind(that), that.queryFrequency);
        }
    }
};
