(function($) {
    Sift.SystemConfig = {
        softwareBuildTime: mainController.getBuildTime(),
        softwareVersion: mainController.getSoftwareVersion(),
        firmwareVersion: mainController.getFirmwareVersion(),
        hardwareVersion: mainController.getHardwareVersion(),
        
        toTrackerData: function() {
            return {
                software_build_time: this.softwareBuildTime,
                software_version: this.softwareVersion,
                firmware_version: this.firmwareVersion,
                hardware_version: this.hardwareVersion
            };
        }
    };
})(jQuery);