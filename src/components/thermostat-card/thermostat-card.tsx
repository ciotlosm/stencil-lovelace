import { Component, Listen, State, Method, Prop, Watch } from '@stencil/core';

@Component({
  tag: 'thermostat-card',
  shadow: true
})
export class Thermostat {
  @Prop() hass: any;
  @State() _saved_state: any;
  _hass: any;
  _config: any;

  @Watch('hass')
  hassHandler(hass: any) {
    const config = this._config;
    const entity = hass.states[config.entity];
    let hvac_state;
    if (config.hvac.attribute)
      hvac_state = entity.attributes[config.hvac.attribute];
    else
      hvac_state = entity.state;
    const new_state = {
      min_value: entity.attributes.min_temp,
      max_value: entity.attributes.max_temp,
      ambient_temperature: entity.attributes.current_temperature,
      target_temperature: entity.attributes.temperature,
      target_temperature_low: entity.attributes.target_temp_low,
      target_temperature_high: entity.attributes.target_temp_high,
      hvac_state: config.hvac.states[hvac_state] || 'off',
      away: (entity.attributes.away_mode == 'on' ? true : false),
    }
    if (!this._saved_state ||
      (this._saved_state.min_value != new_state.min_value ||
        this._saved_state.max_value != new_state.max_value ||
        this._saved_state.ambient_temperature != new_state.ambient_temperature ||
        this._saved_state.target_temperature != new_state.target_temperature ||
        this._saved_state.target_temperature_low != new_state.target_temperature_low ||
        this._saved_state.target_temperature_high != new_state.target_temperature_high ||
        this._saved_state.hvac_state != new_state.hvac_state ||
        this._saved_state.away != new_state.away)) {
      this._saved_state = new_state;
    }
  }
  @Listen('onUpdate')
  _controlSetPoints(event) {
    console.log(event);
    // if (this.thermostat_dial.dual) {
    //   if (this.thermostat_dial.temperature.high != this._saved_state.target_temperature_high ||
    //     this.thermostat_dial.temperature.low != this._saved_state.target_temperature_low)
    //     this._hass.callService('climate', 'set_temperature', {
    //       entity_id: this._config.entity,
    //       target_temp_high: this.thermostat_dial.temperature.high,
    //       target_temp_low: this.thermostat_dial.temperature.low,
    //     });
    // } else {
    //   if (this.thermostat_dial.temperature.target != this._saved_state.target_temperature)
    //     this._hass.callService('climate', 'set_temperature', {
    //       entity_id: this._config.entity,
    //       temperature: this.thermostat_dial.temperature.target,
    //     });
    // }
  }

  @Method()
  setConfig(config) {
    console.log('Snow monster was here');
    // Check config
    if (!config.entity && config.entity.split(".")[0] === 'climate') {
      throw new Error('Please define an entity');
    }

    // Prepare config defaults
    const cardConfig = Object.assign({}, config);
    // cardConfig.hvac = Object.assign({}, config.hvac);
    // if (!cardConfig.pending) cardConfig.pending = 3;
    // if (!cardConfig.idle_zone) cardConfig.idle_zone = 2;
    // if (!cardConfig.step) cardConfig.step = 0.5;
    // if (!cardConfig.no_card) cardConfig.no_card = false;
    // if (!cardConfig.tick_degrees) cardConfig.tick_degrees = 300;

    // // Extra config values generated for simplicity of updates
    // cardConfig.ticks_outer_radius = cardConfig.diameter / 30;
    // cardConfig.ticks_inner_radius = cardConfig.diameter / 8;
    // cardConfig.offset_degrees = 180 - (360 - cardConfig.tick_degrees) / 2;
    this._config = cardConfig;
  }
  render() {
    return (
      <thermostat-dial></thermostat-dial>
    );
  }
}