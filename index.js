var wirelesstags = require('./lib/wireless_tags_api');

var Service, Characteristic, Accessory;

var WirelessTagAccessory;

// Handle registration with homebridge
module.exports = function(homebridge) {
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
    reloadData: function(callback) {
        var that = this;
        var foundAccessories = [];
        
        wirelesstags.getTagList(this.token, function(devices) {
            if (devices && devices instanceof Array) {
                for (var i = 0; i < devices.length; i++) {
                    var device = devices[i];
                    var accessory = undefined;

                    // Device already added, so just load data
                    if (that.deviceLookup[device.uuid]) {
                        accessory = that.deviceLookup[device.uuid];
                        accessory.device = device;
                        if (accessory.emulateThermostat) {
                            // Supplement additional config data
                            wirelesstags.loadTempSensorConfig(device.slaveId, token, function (sensorConfig) {
                                if (sensorConfig) {
                                    accessory.config = sensorConfig;
                                    accessory.loadData();
                                } else {
                                    that.log("loadTempSensorConfig - error getting tag config for " + device.uuid);
                                }
                            });
                        } else {
                            accessory.loadData();
                        }
                    }
                    else {
                        accessory = new WirelessTagAccessory(that, device, {
                            motionSensor: that.motionSensors.indexOf(device.name) >= 0,
                            contactSensor: that.contactSensors.indexOf(device.name) >= 0,
                            emulateThermostat: that.emulateThermostats.indexOf(device.name) >= 0
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
                
                if (callback) {
                    callback(foundAccessories);
                }
            }
            else {
                that.log("getTagList - error getting tag list");
                if (callback) {
                    callback(foundAccessories);
                }
            }
        });
    },
    accessories: function(callback) {
        this.log("Fetching Wireless Tags");
        var that = this;
        var foundAccessories = [];
        this.deviceLookup = [];
        
        this.reloadData(function(foundAccessories) {
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

WirelessTagAccessory = require('./accessories/wireless_tag')(Accessory, Service, Characteristic);
let test = new WirelessTagPlatform(console.log,         {
    "platform": "wireless-sensor-tag",
    "name": "wireless-sensor-tag",
    "token": "3a9abee5-67bc-4733-b2e6-cf5c3ff09202",
    "queryFrequency": 20000,
    "motionSensors": [],
    "contactSensors": []
});
test.accessories(a => console.log(a));

