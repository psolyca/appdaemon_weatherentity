# Description
Base weather widget for appdaemon homeassistant dashboards.

Based on the [appdaemon weather official widget](https://github.com/AppDaemon/appdaemon/blob/dev/appdaemon/widgets/baseweather/baseweather.js), this extends it by allowing to get weather from a weather entity in addition to sensors.
This avoids having to declare sensors, often specifics to each provider, and use directly the homeassistant weather entity. This makes the feature more generic (currently tested with openweathermap and meteo-france).

In addition, this version also adds the feature to display up to 4 days/hours of forecast.

**Note: For 2x2 widget, only 1 forecast should be used with a 120x120 widget. Up to four can be used in 3x2.**
**NOTE2: For 3x2 widget, I need to have and empty line on my layout !! See 2nd example**

#### 3x2 widget with 4 forecasts in hourly mode
<img src="https://github.com/psolyca/appdaemon_weatherentity/blob/master/etc/3x2_hourly.png" width="360">

#### 3x2 widget with 4 forecasts in daily mode
<img src="https://github.com/psolyca/appdaemon_weatherentity/blob/master/etc/3x2_daily.png" width="360">

#### 3x2 widget with 4 forecasts and precipitations probability
<img src="https://github.com/psolyca/appdaemon_weatherentity/blob/master/etc/3x2_proba.png" width="360">

#### 2x2 widget with 1 forecasts
<img src="https://github.com/psolyca/appdaemon_weatherentity/blob/master/etc/2x2.png" width="240">

#### 3x2 widget with 4 forecasts in hourly mode and 3x1 widget with 4 forecasts in daily mode with only forecast and skip first day (the day was the 16/08/2025)
<img src="https://github.com/psolyca/appdaemon_weatherentity/blob/master/etc/3x2_hourly+3x1_daily.png" width="360">

## Configuration

The configuration is the following:
- ```entity```: Can be specified in place of ```entities``` to use a weather entity instead of a sensor list
- ```show_forecast```: Can be set to the number of forecasts to display (up to 4, 0 = no forecast)
- ```show_only_forecast```: Can be set to show only forecast.
- ```forecast_type```: Can be set to enable hourly or daily forecast. Defaults to daily. Must be configured accordingly in homeassistant to have appdaemon receive the correct forecast data. Twice a day is not implemented.
- ```forecast_skip_first_day```: Can be set to skip first day of forecast. If weather of the Xth of the month is displayed, do not need it's forecast displayed.
- ```forecast_precipitation_preference```: Can be set to "%" or "mm" to display your preference on forecast, the precipitation probability or the precipitation quantity. Fallback to the existed value.
- ```forecast_date_format```: Specify the date format for forecast weather. Defaults to "MM/DD". Non padded dates can be used with single letters, e.g. "D/MM" to get non padded days.
- ```prefer_icons```: Can be set to use icons instead of texts

## Example configuration

```yaml
openweathermap:
  title: Now
  widget_type: weatherentity
  entity: weather.openweathermap
  show_forecast: 4
  forecast_type: hourly
  forecast_date_format: "DD/MM"
  prefer_icons: 1
  forecast_precipitation_preference: "mm"

layout:
    - label(2x2),openweathermap(3x2)
```

or

```yaml
MainWeather:
  title: Today
  widget_type: weatherentity
  entity: weather.meteofrance
  show_forecast: 4
  show_only_forecast: 0
  forecast_type: hourly
  forecast_skip_first_day: 0
  forecast_precipitation_preference: "mm"
  forecast_date_format: "DD/MM"
  prefer_icons: 1
SubWeather:
  title: ""
  widget_type: weatherentity
  entity: weather.meteofrance
  show_forecast: 4
  show_only_forecast: 1
  forecast_type: daily
  forecast_date_format: "DD/MM"
  forecast_skip_first_day: 1
  forecast_precipitation_preference: "mm"
  prefer_icons: 1

layout:
    - MainWeather(3x2)
    -
    - SubWeather(3x1)
```
