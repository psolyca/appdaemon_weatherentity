// Base weather widget allowing to get whether from a weather entitied in addition to sensors.
// Also adds up to 4 days/hours of forecast.
// Fully compliant with the official base widget.
// Note: For 2x2 widget, only 1 forecqst should be used. Up to for can be used in 3x2.
//
// ex:
// openweathermap:
//   title: Now
//   widget_type: weatherentity
//   entity: weather.openweathermap
//   show_forecast: 4
//   prefer_icons: 1
//   # Units as configured in homeassistant
//   units: "&deg;C"
//   wind_unit: "km/h"
//   pressure_unit: "hPa"
//   rain_unit: "%"
//
// layout:
//     - label(2x2),openweathermap(3x2)
//
// Based on the appdaemon weather widget:
// https://github.com/AppDaemon/appdaemon/blob/dev/appdaemon/widgets/baseweather/baseweather.js
// Updated to be compliant with weather entity https://www.home-assistant.io/integrations/weather/
// I did not check sensors compatibilities for fields :
// precip_probability, precip_intensity, precip_type
// as these fields are not provided by the weather entity
// BtW some fields are also not implemented
// cloud_coverage, dew_point, uv_index, visibility, wind_gust_speed

function OnStateAvailable(self, state)
{
    self.state = state.state;
}

function base_weatherentity(widget_id, url, skin, parameters)
{
    // Will be using "self" throughout for the various flavors of "this"
    // so for consistency ...
    self = this;

    // Initialization
    self.widget_id = widget_id;

    // Parameters may come in useful later on
    self.parameters = parameters;

    var callbacks = [];
    // Define callbacks for entities - this model allows a widget to monitor multiple entities if needed
    // Initial will be called when the dashboard loads and state has been gathered for the entity
    // Update will be called every time an update occurs for that entity
    self.OnStateAvailable = OnStateAvailable;
    self.OnStateUpdate = OnStateUpdate;

    var monitored_entities = []
    var weather_instance

    self.show_only_forecast = parameters.show_only_forecast;
    self.show_forecast = parameters.show_forecast;
    self.forecast_type = parameters.forecast_type;
    self.forecast_skip_first_day = parameters.forecast_skip_first_day===1?true:false;
    self.show_forecast += parameters.forecast_skip_first_day===1?1:0;
    // If entity is specified, we are monitoring a weather entity
    if ("entity" in parameters)
    {
        self.sensor_monitoring = false;
        var monitored_entities = [
            {"entity": parameters.entity, "initial": self.OnStateAvailable, "update": self.OnStateUpdate}
        ]
        // To get forecast, we need to call a service
        if (parameters.show_forecast > 0)
        {
            self.service_parameters = {'service': 'weather/get_forecasts', 'entity_id': parameters.entity, 'type': parameters.forecast_type}
        }
    }
    else if ("entities" in parameters)
    {
        self.sensor_monitoring = true;
        // Map will be used to know what field are we going to update from what sensor
        self.entities_map = {}

        // If entities are specified, we are monitoring a set of sensors
        var entities = $.extend({}, parameters.entities, parameters.sensors);
        for (var key in entities)
        {
            var entity = entities[key]
            if (entity != '' && check_if_forecast_sensor(parameters.show_forecast, entity))
            {
                monitored_entities.push({
                    "entity": entity, "initial": self.OnStateAvailable, "update": self.OnStateUpdate
                })
                self.entities_map[entity] = key
            }
        }
    }
    else
    {
        console.log("Missing entity or entities definition in weather widget");
    }

    // If forecast is disabled - don't monitor the forecast sensors
    function check_if_forecast_sensor(show_forecast, entity)
    {
        if (show_forecast)
        {
          return true
        }
        else if(entity.substring(entity.length - 2) === "_1")
        {
          return false
        }
        else
        {
          return true
        }
    }

    // Finally, call the parent constructor to get things moving
    WidgetBase.call(self, widget_id, url, skin, parameters, monitored_entities, callbacks);
	
	this.call_service = function(child, args, callback)
    {
        if ("resident_namespace" in child.parameters)
        {
            ns = child.parameters.resident_namespace
        }
        else
        {
            ns = child.parameters.namespace;
        }

        service = args["service"];

        window.dashstream.stream.call_service(service, ns, args, callback)
    };

    // Function Definitions

    // The OnStateAvailable function will be called when
    // self.state[<entity>] has valid information for the requested entity
    // state is the initial state
    // Methods
    function OnStateUpdate(self, state)
    {
        set_view(self, state)
    }

    function OnStateAvailable(self, state)
    {
        set_view(self, state)
    }

    function compute_icon_rotation(bearing)
    {
        var counts = [45, 90, 135, 180, 225, 270, 315]
        var goal = (parseInt(bearing) + 270) % 360
        var closest = counts.reduce(function(prev, curr) {
              return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
        });
        return closest;
    }

    function get_weather_icon(condition)
    {
        // Map weather condition/states with their mdi name. Defaults to the same
        var icon_map = {
            'partlycloudy':'partly-cloudy',
            'clear-night':'night',
            'exceptional': 'cloudy-alert'
        }
        return "mdi mdi-weather-" + (icon_map[condition] || condition);
    }

    function pad(num)
    {
        return num<10 ? '0' + num : num.toString()
    }

    // Avoid "NaN" string in view
    function format_number(value)
    {
        return typeof value !== "undefined"?self.format_number(self, value):'';
    }

    function get_date_str(self, datetime)
    {
        format = self.parameters.forecast_date_format ? self.parameters.forecast_date_format: self.parameters.fields.forecast_date_format;
        day = evt_datetime.getDate();
        month = evt_datetime.getMonth()+1;

        // Replace DD and MM with padded versions then D and M with non padded
        date_str = format.replace("DD", pad(day)).replace("MM", pad(month)).replace("D", day).replace("M", month);
        return date_str;
    }

    // Set the view when data are coming from multiple sensors
    function set_view_from_sensors(self, state)
    {
        field = self.entities_map[state.entity_id]
        if (field)
        {
            if (field == 'icon' || field == 'forecast_icon')
            {
                self.set_field(self, field, state.state)
                return
            }

            if (field == 'precip_type')
            {
                self.set_field(self, "precip_type_icon", self.parameters.icons[state.state])
            }
            else if (field == 'forecast_precip_type')
            {
                self.set_field(self, "forecast_precip_type_icon", self.parameters.icons[state.state])
            }
            else if (field == 'wind_bearing')
            {
                self.set_field(self, "bearing_icon", "mdi-rotate-" + compute_icon_rotation(state.state))
            }
            self.set_field(self, field, format_number(state.state))
        }
    }

    function set_view_from_forecast(data)
    {
        self = weather_instance;
        entity_id = data.request.data.data.entity_id
        forecast_data = data.data.result.response[entity_id].forecast
        fc_available = Object.keys(forecast_data).length
        fc_min = self.forecast_skip_first_day?1:0
        fc_max = (self.show_forecast > fc_available)?fc_available:self.show_forecast;
        for (idx = fc_min; idx < fc_max; idx++)
        {
            attr_suffix= self.forecast_skip_first_day?idx:idx+1;
            forecast = forecast_data[idx];
            evt_datetime = new Date(forecast.datetime);
            self.set_field(self, "forecast_icon"+attr_suffix, get_weather_icon(forecast.condition));
            if (self.parameters.forecast_precipitation_preference == "%" && forecast.precipitation_probability)
            {
                self.set_field(self, "forecast_precip_probability"+attr_suffix, format_number(forecast.precipitation_probability.toFixed(0)));
            }
            else if (forecast.precipitation)
            {
                self.set_field(self, "forecast_precip"+attr_suffix, format_number(forecast.precipitation.toFixed(1)));
            }
            else if (forecast.precipitation_probability)
            {
                self.set_field(self, "forecast_precip_probability"+attr_suffix, format_number(forecast.precipitation_probability.toFixed(0)));
            }
            self.set_field(self, "forecast_wind_speed"+attr_suffix, format_number(forecast.wind_speed));
            self.set_field(self, "forecast_bearing_icon"+attr_suffix, "mdi-rotate-" + compute_icon_rotation(forecast.wind_bearing));
            self.set_field(self, "forecast_wind_bearing"+attr_suffix, format_number(forecast.wind_bearing));

            if (self.forecast_type === "daily")
            {
                fc_title = get_date_str(self, evt_datetime);
                self.set_field(self, "forecast_title"+attr_suffix, fc_title);
                self.set_field(self, "forecast_temperature_min"+attr_suffix, format_number(forecast.templow));
                self.set_field(self, "forecast_temperature_max"+attr_suffix, format_number(forecast.temperature));
            }
            else
            {
                fc_title = evt_datetime.getHours() + "h";
                self.set_field(self, "forecast_title"+attr_suffix, fc_title);
                self.set_field(self, "forecast_temperature_min"+attr_suffix, format_number(forecast.temperature));
            }
        }
    }

    // Set the view when data are coming from a single weather entity
    function set_view_from_entity(self, state)
    {
        // Setbearing icons
        self.set_field(self, "bearing_icon", "mdi-rotate-" + compute_icon_rotation(state.attributes.wind_bearing));
        self.set_field(self, "icon", get_weather_icon(state.state));

        // Set measures
        self.set_field(self, "temperature", format_number(state.attributes.temperature));
        self.set_field(self, "apparent_temperature", format_number(state.attributes.apparent_temperature));
        self.set_field(self, "pressure", format_number(state.attributes.pressure));
        self.set_field(self, "humidity", format_number(state.attributes.humidity));
        self.set_field(self, "wind_speed", format_number(state.attributes.wind_speed));
        self.set_field(self, "wind_bearing", format_number(state.attributes.wind_bearing));

        if (self.show_forecast > 0)
        {
            // Keep weatherentity instance for callback return
            weather_instance = self;
            self.call_service(self, self.service_parameters, set_view_from_forecast);
        }
    }

    function set_view(self, state)
    {
        if (self.sensor_monitoring)
        {
            set_view_from_sensors(self, state);
        }
        else
        {
            set_view_from_entity(self, state);
        }
    }
}
