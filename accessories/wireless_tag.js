var inherits = require('util').inherits;
var EventState = require('../lib/event_state');
var LightState = require('../lib/light_state');

var Accessory, Service, Characteristic, uuid;

/*
 *  Wireless Sensor Tag Accessory
 */

module.exports = function(oAccessory, oService, oCharacteristic) {
    if (oAccessory) {
        Accessory = oAccessory;
        Service = oService;
        Characteristic = oCharacteristic;

        inherits(WirelessTagAccessory, Accessory);
        WirelessTagAccessory.prototype.getServices = getServices;
        WirelessTagAccessory.prototype.loadData = loadData;
    }
    return WirelessTagAccessory;
};
module.exports.WirelessTagAccessory = WirelessTagAccessory;

function WirelessTagAccessory(platform, device, config, behaviour) {
    this.platform = platform;
    this.behaviour = behaviour;
    this.log = platform.log;
    this.device = device;
    this.config = config;
    this.name = device.name;
    this.uuid = device.uuid;
    this.uuid_base = this.uuid;
    Accessory.call(this, this.name, this.uuid);
    
    var that = this;
    
    // Motion
    if (that.behaviour.motionSensor) {
        this.addService(Service.MotionSensor)
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', function(callback) {
            callback(null, that.device.eventState === EventState.DETECTED_MOVEMENT || that.device.eventState === EventState.MOVED);
        });
    }
    
    // Contact
    if (that.behaviour.contactSensor) {
        this.addService(Service.ContactSensor)
            .getCharacteristic(Characteristic.ContactSensorState)
            .on('get', function(callback) {
            if (that.device.eventState === EventState.OPENED || that.device.lightEventState === LightState.TOO_BRIGHT) {
                callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
            }
            else {
                callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
            }
                    
        });
    }

    // Thermostat - will be used for temperature and humidity if set
    let thermostat;
    if (that.behaviour.emulateThermostat) {
        thermostat = this.addService(Service.Thermostat);
        thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .on('get', function (callback) {
                callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
            });
        thermostat.getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('get', function (callback) {
                let value = {
                    1: Characteristic.TargetHeatingCoolingState.OFF,
                    2: Characteristic.TargetHeatingCoolingState.HEAT,
                    3: Characteristic.TargetHeatingCoolingState.COOL
                }[that.device.tempEventState] || Characteristic.TargetHeatingCoolingState.OFF;
                callback(null, value);
            });
        thermostat.getCharacteristic(Characteristic.TargetTemperature)
            .on('get', function (callback) {
                callback(null, that.device.temperature);
            });
        thermostat.getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .on('get', function (callback) {
                callback(null, that.config.temp_unit ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS)
            });
        thermostat.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .on('get', function (callback) {
                callback(null, that.config.th_low);
            });
        thermostat.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .on('get', function (callback) {
                callback(null, that.config.th_high);
            });
    }
    
    // Temperature
    (thermostat || this.addService(Service.TemperatureSensor))
        .getCharacteristic(Characteristic.CurrentTemperature)
        .setProps({
            minValue: -100,
            maxValue: 100
        })
        .on('get', function(callback) {
            callback(null, that.device.temperature);
        });

    // Humidity
    (thermostat || this.addService(Service.HumiditySensor))
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on('get', function(callback) {
            callback(null, that.device.cap !== undefined ? Math.round(that.device.cap) : 0.0);
        });

    // Battery
    this.addService(Service.BatteryService)
        .getCharacteristic(Characteristic.BatteryLevel)
        .on('get', function(callback) {
        callback(null, that.device.batteryRemaining * 100);
    });

    this.getService(Service.BatteryService)
        .getCharacteristic(Characteristic.StatusLowBattery)
        .on('get', function(callback) {
        if (that.device.batteryRemaining < 0.25)
            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
        else
            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
    });

    this.getService(Service.BatteryService)
        .setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING);

    this.loadData();
}

var getServices = function() {
    return this.services;
}

var loadData = function() {
    // Motion
    if (this.behaviour.motionSensor) {
        this.getService(Service.MotionSensor)
            .getCharacteristic(Characteristic.MotionDetected)
            .getValue();
    }
    
    // Contact
    if (this.behaviour.contactSensor) {
        this.getService(Service.ContactSensor)
            .getCharacteristic(Characteristic.ContactSensorState)
            .getValue();
    }

    // Thermostat
    let thermostat;
    if (this.behaviour.emulateThermostat) {
        thermostat = this.getService(Service.Thermostat);
        thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .getValue();
        thermostat.getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .getValue();
        thermostat.getCharacteristic(Characteristic.TargetTemperature)
            .getValue();
        thermostat.getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .getValue();
        thermostat.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .getValue();
        thermostat.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .getValue();
    }    
    
    // Temperature
    (thermostat || this.getService(Service.TemperatureSensor))
        .getCharacteristic(Characteristic.CurrentTemperature)
        .getValue();

    // Humidity
    (thermostat || this.getService(Service.HumiditySensor))
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .getValue();

    // Battery
    this.getService(Service.BatteryService)
        .getCharacteristic(Characteristic.BatteryLevel)
        .getValue();
    this.getService(Service.BatteryService)
        .getCharacteristic(Characteristic.StatusLowBattery)
        .getValue();
};