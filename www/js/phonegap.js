PhoneGap = {
    plugins: {},
    constructors: {},
    callbacks: [],
};

/*
 * Execute a call to a plugin function
 */
PhoneGap.exec = function( successCallback, errorCallback, pluginName, functionName, parameters ) {
    if( typeof PhoneGap.plugins[pluginName] == "undefined" ) {
        if( typeof errorCallback == "function" ) errorCallback();
        return;
    }

    // Store a reference to the callback functions
    var scId = PhoneGap.callbacks.length;
    var ecId = scId + 1;
    PhoneGap.callbacks[scId] = successCallback;
    PhoneGap.callbacks[ecId] = errorCallback;

    parameters.unshift( ecId );
    parameters.unshift( scId );

    // Call the function
    /*debug.log( "Call: " + pluginName + " / " + functionName );
    debug.log( "P-Obj: " + (typeof PhoneGap.plugins[pluginName]) );
    debug.log( "P-Func: " + (typeof PhoneGap.plugins[pluginName][functionName]) );*/
    //PhoneGap.plugins[pluginName][functionName](scId, ecId, parameters);
    PhoneGap.plugins[pluginName][functionName].apply(this, parameters);
}

/*
 * Execute a passed callback function, called by the native plugin-code
 */
PhoneGap.callback = function() {
    var scId = arguments[0];

    var parameters = [];
    for( var i = 1; i < arguments.length; i++ ) {
        //debug.log( "Adding parameter " + arguments[i] );
        parameters[i-1] = arguments[i];
    }

    if( typeof PhoneGap.callbacks[scId] == "function" ) {
        PhoneGap.callbacks[scId].apply( this, parameters );
        PhoneGap.callbacks.splice( scId, 1 );
    }
}

/*
 * Register a plugin for use within PhoneGap
 */
PhoneGap.registerPlugin = function( pluginName, pluginObject ) {
    /*if( typeof debug != "undefined" ) {
        debug.log( "Registered " + pluginName + "!" );
    }*/

    // Keep a reference to the plugin object
    PhoneGap.plugins[pluginName] = pluginObject;

    // Run constructor for plugin if available
    if( typeof PhoneGap.constructors[pluginName] == "function" ) PhoneGap.constructors[pluginName]();
}

/*
 * Add a plugin-specific constructor function which is called once the plugin is loaded
 */
PhoneGap.addConstructor = function( pluginName, constructor ) {
    PhoneGap.constructors[pluginName] = constructor;
}

/*
  "OLD" JS CODE
*/
function Accelerometer() {

    this.getCurrentAcceleration = function(accelerometerSuccess, accelerometerError) {
        try {
            var accel = GapAccelerometer.getCurrentAcceleration();
            accelerometerSuccess(accel);
        } catch(err) {
            accelerometerError();
        }
    };
    
    this.watchAcceleration = function(accelerometerSuccess, accelerometerError, options) {
        var freq = options.frequency || 500;
        var self = this;
        return setInterval(function () {
            self.getCurrentAcceleration(accelerometerSuccess, accelerometerError);
        }, freq);
    };
    
    this.clearWatch = function(watchID) {
        clearInterval(watchID);
    };
}


function DebugConsole() {
}

DebugConsole.prototype.log = function (output, showTime) {
        if (showTime) {
                var now = "" + new Date().getTime();
                output = now.substring(now.length - 5) + ": " + output;
        }
        GapDebugConsole.log(output);
}


/**
 * This class provides access to the device camera.
 * @constructor
 */
Camera = function() {
        this.successCallback = null;
        this.errorCallback = null;
        var self = this;

        window.GapCamera.pictureDataCaptured.connect(function(image) {
                if (typeof(self.successCallback) == 'function') {
                        console.log("pictureDataCaptured");
                        self.successCallback(image);
                }
        });

        window.GapCamera.pictureFileCaptured.connect(function(fileName) {
                if (typeof(self.successCallback) == 'function') {
                        console.log("pictureFileCaptured");
                        self.successCallback(fileName);
                }
        });

        window.GapCamera.error.connect(function(errorCode, message) {
                if (typeof(self.errorCallback) == 'function') {
                        /// @todo translate error message
                        self.errorCallback(message);
                }
        });
}

/**
 * Format of image returned from getPicture
 */
Camera.DestinationType = {
        DATA_URL: 0,
        FILE_URI: 1
};
Camera.prototype.DestinationType = Camera.DestinationType;

/**
 * We use the Platform Services 2.0 API here. So we must include a portion of the
 * PS 2.0 source code (camera API).
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
Camera.prototype.getPicture = function(successCallback, errorCallback, options){

        this.successCallback = successCallback;
        this.errorCallback = errorCallback;

        GapCamera.quality = (typeof(options) == 'object' && options.quality) ? options.quality : 75;
        GapCamera.destinationType = (typeof(options) == 'object' && options.destinationType) ?
                                                                 options.destinationType :
                                                                 this.DestinationType.DATA_URL; // default to BASE64 encoded image

        GapCamera.takePicture();
}


NetworkStatus = {
    NOT_REACHABLE: 0,
    REACHABLE_VIA_WIFI_NETWORK: 1,
    REACHABLE_VIA_CARRIER_DATA_NETWORK: 2
};

function Network() {

    this.isReachable = function(hostName, successCb, options) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", hostName, true);
        xhr.onreadystatechange = function(req) {
            if (xhr.readyState != 4) {
                return;
            }

            alert(xhr.status);
            if (xhr.status != 200 && xhr.status != 304) {
                successCb(NetworkStatus.NOT_REACHABLE);
            } else {
                successCb(NetworkStatus.REACHABLE_VIA_WIFI_NETWORK);
            }
        };
        xhr.send();
    }
}


/**
 * This class provides access to device GPS data.
 * @constructor
 */
function Geolocation() {
    /**
     * The last known GPS position.
     */
    this.lastPosition = null;
    this.lastError = null;

    var self = this;
    GapGeolocation.positionUpdated.connect(function(position) {
        self.lastPosition = position;
    });
    GapGeolocation.error.connect(function(error) {
        self.lastError = error;
    });
}

/**
 * Asynchronously aquires the current position.
 * @param {Function} successCallback The function to call when the position
 * data is available
 * @param {Function} errorCallback The function to call when there is an error
 * getting the position data.
 * @param {PositionOptions} options The options for getting the position data
 * such as timeout.
 */
Geolocation.prototype.getCurrentPosition = function(successCallback, errorCallback, options) {
    var referenceTime = 0;
    if (this.lastPosition) {
        referenceTime = this.lastPosition.timeout;
    } else {
        this.start(options);
    }

    var timeout = 20000;
    var interval = 500;
    if (typeof(options) == 'object' && options.interval) {
        interval = options.interval;
    }

    if (typeof(successCallback) != 'function') {
        successCallback = function() {};
    }
    if (typeof(errorCallback) != 'function') {
        errorCallback = function() {};
    }

    var self = this;
    var delay = 0;
    var timer = setInterval(function() {
        delay += interval;

        if (typeof(self.lastPosition) == 'object' && self.lastPosition.timestamp > referenceTime) {
            successCallback(self.lastPosition);
            clearInterval(timer);
        } else if (delay >= timeout) {
            errorCallback({
                code: PositionError.TIMEOUT,
                message: "A timeout occurred."
            });
            clearInterval(timer);
        } else {
            // the interval gets called again
        }
    }, interval);
};

/**
 * Asynchronously aquires the position repeatedly at a given interval.
 * @param {Function} successCallback The function to call each time the position
 * data is available
 * @param {Function} errorCallback The function to call when there is an error
 * getting the position data.
 * @param {PositionOptions} options The options for getting the position data
 * such as timeout and the frequency of the watch.
 */
Geolocation.prototype.watchPosition = function(successCallback, errorCallback, options) {
    // Invoke the appropriate callback with a new Position object every time the implementation
    // determines that the position of the hosting device has changed.

    this.getCurrentPosition(successCallback, errorCallback, options);
    var maximumAge = 10000;
    if (typeof(options) == 'object' && options.maximumAge) {
        maximumAge = options.maximumAge;
    }

    var self = this;
    return setInterval(function() {
        self.getCurrentPosition(successCallback, errorCallback, options);
    }, maximumAge);
};

/**
 * Clears the specified position watch.
 * @param {String} watchId The ID of the watch returned from #watchPosition.
 */
Geolocation.prototype.clearWatch = function(watchId) {
    clearInterval(watchId);
};

Geolocation.prototype.start = function(options) {
    GapGeolocation.start(options.interval);
};

Geolocation.prototype.stop = function() {
    GapGeolocation.stop();
};


function Utility() {

    this.exit = function() {
        GapUtility.exit();
    };
}


function Device() {

    this.name = GapDeviceInfo.name;
    this.platform = GapDeviceInfo.platform;
    this.uuid = GapDeviceInfo.uuid;
    this.version = GapDeviceInfo.version;
    this.phonegap = '0.9.2';
}


/*
 * Workaround for old JS functionality
 */
PhoneGap.addConstructor( "com.phonegap.Console",
                        function() {
                            if (typeof debug == "undefined") debug = new DebugConsole();
                        }
                        );

PhoneGap.addConstructor( "com.phonegap.Accelerometer",
                        function() {
                            if (typeof navigator.accelerometer == "undefined") navigator.accelerometer = new Accelerometer();
                        }
                        );

PhoneGap.addConstructor( "com.phonegap.Camera",
                        function() {
                            if (typeof navigator.camera == "undefined" && typeof window.GapCamera != "undefined" ) navigator.camera = new Camera();
                        }
                        );

PhoneGap.addConstructor( "com.phonegap.Geolocation",
                        function() {
                            if (typeof navigator.geolocation == "undefined") navigator.geolocation = new Geolocation();
                        }
                        );

PhoneGap.addConstructor( "com.phonegap.Notification",
                        function() {
                            if (typeof navigator.notification == "undefined") navigator.notification = new Notification();
                        }
                        );

PhoneGap.addConstructor( "com.phonegap.Utility",
                        function() {
                            if (typeof navigator.utility == "undefined") navigator.utility = new Utility();
                        }
                        );

if (typeof navigator.network == "undefined") navigator.network = new Network();
if (typeof window.device == "undefined") window.device = new Device();
