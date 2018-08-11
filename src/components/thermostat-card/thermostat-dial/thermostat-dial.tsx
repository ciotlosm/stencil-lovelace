import { Component, Prop, State } from '@stencil/core';
import { SvgUtil } from '../svgutil'
@Component({
  tag: 'thermostat-dial',
  styleUrl: 'thermostat-dial.scss',
  shadow: true
})
export class ThermostatDial {
  @Prop() diameter: number = 400;
  @Prop() num_ticks: number = 150;

  @State() radius: number = this.diameter / 2;
  @State() ticks: any = [];

  render() {
    // root
    const viewBox = [0, 0, this.diameter, this.diameter].join(' ');

    // outer ring
    const defEditableIndicator = SvgUtil.donutPath(this.radius, this.radius, this.radius - 4, this.radius - 8);
    for (let i = 0; i < this.num_ticks; i++) {
        this.ticks.push(<path key={i} />);
    }
    // Leaf
    const leafScale = this.radius / 500;
    const defLeaf = SvgUtil.scalePath(["M", 3, 84, "c", 24, 17, 51, 18, 73, -6, "C", 100, 52,
      100, 22, 100, 4, "c", -13, 15, -37, 9, -70, 19, "C", 4, 32, 0, 63, 0,
      76, "c", 6, -7, 18, -17, 33, -23, 24, -9, 34, -9, 48, -20, -9, 10,
      -20, 16, -43, 24, "C", 22, 63, 8, 78, 3, 84, "z"], leafScale);
    const leafPosition = 'translate(' + [this.radius - (leafScale * 5), this.radius * 1.5].join(',') + ')';

    return (
      <div class='dial_container'>
        <svg xmlns="http://www.w3.org/svg/2000"
          width='100%' height='100%' viewBox={viewBox} class='dial'>
          <circle
            cx={this.radius} cy={this.radius} r={this.radius} class='dial_shape'>
          </circle>
          <path
            d={defEditableIndicator} class='dial__editableIndicator'
          ></path>
          <g class='dial__ticks'>
            {this.ticks}
          </g>
          <path
            d={defLeaf}
            class='dial__ico__leaf'
            transform={leafPosition}
          ></path>
        </svg>
      </div>
    );
  }


  // to be refactored
  @State() _root: any;
  @Prop() _config: {
    title: string,
    radius: number,
    pending: number,
    tick_degrees: number,
    diameter: number,
    num_ticks: number,
    step: number,
    idle_zone: number,
    ticks_outer_radius: number,
    ticks_inner_radius: number,
    offset_degrees: number,
    chevron_size: number,
    control: any,
  };
  @State() _ticks: any;
  @State() _controls: any;
  @State() _dual: boolean;
  @State() _in_control: boolean;
  @State() _ambient: number;
  @State() _low: number;
  @State() _high: number;
  @State() _target: number;
  @Prop() min_value: number;
  @Prop() max_value: number;
  @Prop() hvac_state: any;
  @State() _timeoutHandler: any;

  set dual(val) {
    this._dual = val
  }
  get dual() {
    return this._dual;
  }
  get in_control() {
    return this._in_control;
  }
  get temperature() {
    return {
      low: this._low,
      high: this._high,
      target: this._target,
      ambient: this._ambient,
    }
  }
  get ambient() {
    return this._ambient;
  }
  set temperature(val) {
    this._ambient = val.ambient;
    this._low = val.low;
    this._high = val.high;
    this._target = val.target;
    if (this._low && this._high) this.dual = true;
  }

  _updateDial() {

    const config = this._config; // need certain options for updates
    this._ticks = []; // need for dynamic tick updates
    this._controls = []; // need for managing highlight and clicks
    this._dual = false; // by default is single temperature
    const root = {
      appendChild: function (test) { return test },
    };
    root.appendChild(this._buildLeaf(config.radius));
    root.appendChild(this._buildThermoIcon(config.radius));
    root.appendChild(this._buildDialSlot(1));
    root.appendChild(this._buildDialSlot(2));
    root.appendChild(this._buildDialSlot(3));

    root.appendChild(this._buildText(config.radius, 'ambient', 0));
    root.appendChild(this._buildText(config.radius, 'target', 0));
    root.appendChild(this._buildText(config.radius, 'low', -config.radius / 2.5));
    root.appendChild(this._buildText(config.radius, 'high', config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 0, 'low', 0.7, -config.radius / 2.5));
    root.appendChild(this._buildChevrons(config.radius, 0, 'high', 0.7, config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 0, 'target', 1, 0));
    root.appendChild(this._buildChevrons(config.radius, 180, 'low', 0.7, -config.radius / 2.5));
    root.appendChild(this._buildChevrons(config.radius, 180, 'high', 0.7, config.radius / 3));
    root.appendChild(this._buildChevrons(config.radius, 180, 'target', 1, 0));

    this._root = root;
    this._buildControls(config.radius);
    this._root.addEventListener('click', () => this._enableControls());
  }

  updateState(options) {
    const config = this._config;
    const away = options.away || false;
    this.min_value = options.min_value;
    this.max_value = options.max_value;
    this.hvac_state = options.hvac_state;
    this.temperature = {
      low: options.target_temperature_low,
      high: options.target_temperature_high,
      target: options.target_temperature,
      ambient: options.ambient_temperature,
    }

    this._updateClass('has_dual', this.dual);
    let tick_label, from, to;
    const tick_indexes = [];
    const ambient_index = SvgUtil.restrictToRange(Math.round((this.ambient - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const target_index = SvgUtil.restrictToRange(Math.round((this._target - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const high_index = SvgUtil.restrictToRange(Math.round((this._high - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    const low_index = SvgUtil.restrictToRange(Math.round((this._low - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1);
    if (!this.dual) {
      tick_label = [this._target, this.ambient].sort();
      this._updateTemperatureSlot(tick_label[0], -8, `temperature_slot_1`);
      this._updateTemperatureSlot(tick_label[1], 8, `temperature_slot_2`);
      switch (this.hvac_state) {
        case 'cool':
          // active ticks
          if (target_index < ambient_index) {
            from = target_index;
            to = ambient_index;
          }
          break;
        case 'heat':
          // active ticks
          if (target_index > ambient_index) {
            from = ambient_index;
            to = target_index;
          }
          break;
        default:
      }
    } else {
      tick_label = [this._low, this._high, this.ambient].sort();
      this._updateTemperatureSlot(null, 0, `temperature_slot_1`);
      this._updateTemperatureSlot(null, 0, `temperature_slot_2`);
      this._updateTemperatureSlot(null, 0, `temperature_slot_3`);
      switch (this.hvac_state) {
        case 'cool':
          // active ticks
          if (high_index < ambient_index) {
            from = high_index;
            to = ambient_index;
            this._updateTemperatureSlot(this.ambient, 8, `temperature_slot_3`);
            this._updateTemperatureSlot(this._high, -8, `temperature_slot_2`);
          }
          break;
        case 'heat':
          // active ticks
          if (low_index > ambient_index) {
            from = ambient_index;
            to = low_index;
            this._updateTemperatureSlot(this.ambient, -8, `temperature_slot_1`);
            this._updateTemperatureSlot(this._low, 8, `temperature_slot_2`);
          }
          break;
        case 'off':
          // active ticks
          if (high_index < ambient_index) {
            from = high_index;
            to = ambient_index;
            this._updateTemperatureSlot(this.ambient, 8, `temperature_slot_3`);
            this._updateTemperatureSlot(this._high, -8, `temperature_slot_2`);
          }
          if (low_index > ambient_index) {
            from = ambient_index;
            to = low_index;
            this._updateTemperatureSlot(this.ambient, -8, `temperature_slot_1`);
            this._updateTemperatureSlot(this._low, 8, `temperature_slot_2`);
          }
          break;
        default:
      }
    }
    tick_label.forEach(item => tick_indexes.push(SvgUtil.restrictToRange(Math.round((item - this.min_value) / (this.max_value - this.min_value) * config.num_ticks), 0, config.num_ticks - 1)));
    this._updateTicks(from, to, tick_indexes);
    this._updateClass('has-leaf', away);
    this._updateHvacState();
    this._updateText('ambient', this.ambient);
    this._updateEdit(false);
    this._updateClass('has-thermo', false);
  }

  _temperatureControlClicked(index) {
    const config = this._config;
    let chevron;
    this._root.querySelectorAll('path.dial__chevron').forEach(el => SvgUtil.setClass(el, 'pressed', false));
    if (this.in_control) {
      if (this.dual) {
        switch (index) {
          case 0:
            // clicked top left 
            chevron = this._root.querySelectorAll('path.dial__chevron--low')[1];
            this._low = this._low + config.step;
            if ((this._low + config.idle_zone) >= this._high) this._low = this._high - config.idle_zone;
            break;
          case 1:
            // clicked top right
            chevron = this._root.querySelectorAll('path.dial__chevron--high')[1];
            this._high = this._high + config.step;
            if (this._high > this.max_value) this._high = this.max_value;
            break;
          case 2:
            // clicked bottom right
            chevron = this._root.querySelectorAll('path.dial__chevron--high')[0];
            this._high = this._high - config.step;
            if ((this._high - config.idle_zone) <= this._low) this._high = this._low + config.idle_zone;
            break;
          case 3:
            // clicked bottom left
            chevron = this._root.querySelectorAll('path.dial__chevron--low')[0];
            this._low = this._low - config.step;
            if (this._low < this.min_value) this._low = this.min_value;
            break;
        }
        SvgUtil.setClass(chevron, 'pressed', true);
        setTimeout(() => SvgUtil.setClass(chevron, 'pressed', false), 200);
      }
      else {
        if (index < 2) {
          // clicked top
          chevron = this._root.querySelectorAll('path.dial__chevron--target')[1];
          this._target = this._target + config.step;
          if (this._target > this.max_value) this._target = this.max_value;
        } else {
          // clicked bottom
          chevron = this._root.querySelectorAll('path.dial__chevron--target')[0];
          this._target = this._target - config.step;
          if (this._target < this.min_value) this._target = this.min_value;
        }
        SvgUtil.setClass(chevron, 'pressed', true);
        setTimeout(() => SvgUtil.setClass(chevron, 'pressed', false), 200);
      }
    } else {
      this._enableControls();
    }
  }

  _updateEdit(show_edit) {
    SvgUtil.setClass(this._root, 'dial--edit', show_edit);
  }

  _enableControls() {
    const config = this._config;
    this._in_control = true;
    this._updateClass('in_control', this.in_control);
    if (this._timeoutHandler) clearTimeout(this._timeoutHandler);
    this._updateEdit(true);
    this._updateClass('has-thermo', true);
    this._updateText('target', this.temperature.target);
    this._updateText('low', this.temperature.low);
    this._updateText('high', this.temperature.high);
    this._timeoutHandler = setTimeout(() => {
      this._updateText('ambient', this.ambient);
      this._updateEdit(false);
      this._updateClass('has-thermo', false);
      this._in_control = false;
      this._updateClass('in_control', this.in_control);
      config.control();
    }, config.pending * 1000);
  }

  _updateClass(class_name, flag) {
    SvgUtil.setClass(this._root, class_name, flag);
  }

  _updateText(id, value) {
    const lblTarget = this._root.querySelector(`#${id}`).querySelectorAll('tspan');
    const text = Math.floor(value);
    if (value) {
      lblTarget[0].textContent = text;
      if (value % 1 != 0) {
        lblTarget[1].textContent = '5';
      } else {
        lblTarget[1].textContent = '';
      }
    }
    if (this.in_control && id == 'target' && this.dual) {
      lblTarget[0].textContent = '·';
    }
  }

  _updateTemperatureSlot(value, offset, slot) {
    const config = this._config;
    const lblSlot1 = this._root.querySelector(`#${slot}`)
    lblSlot1.textContent = value != null ? SvgUtil.superscript(value) : '';
    const peggedValue = SvgUtil.restrictToRange(value, this.min_value, this.max_value);
    const position = [config.radius, config.ticks_outer_radius - (config.ticks_outer_radius - config.ticks_inner_radius) / 2];
    let degs = config.tick_degrees * (peggedValue - this.min_value) / (this.max_value - this.min_value) - config.offset_degrees + offset;
    const pos = SvgUtil.rotatePoint(position, degs, [config.radius, config.radius]);
    SvgUtil.attributes(lblSlot1, {
      x: pos[0],
      y: pos[1]
    });
  }

  _updateHvacState() {
    this._root.classList.forEach(c => {
      if (c.indexOf('dial--state--') != -1)
        this._root.classList.remove(c);
    });
    this._root.classList.add('dial--state--' + this.hvac_state);
  }

  _updateTicks(from, to, large_ticks) {
    const config = this._config;

    const tickPoints = [
      [config.radius - 1, config.ticks_outer_radius],
      [config.radius + 1, config.ticks_outer_radius],
      [config.radius + 1, config.ticks_inner_radius],
      [config.radius - 1, config.ticks_inner_radius]
    ];
    const tickPointsLarge = [
      [config.radius - 1.5, config.ticks_outer_radius],
      [config.radius + 1.5, config.ticks_outer_radius],
      [config.radius + 1.5, config.ticks_inner_radius + 20],
      [config.radius - 1.5, config.ticks_inner_radius + 20]
    ];

    this._ticks.forEach((tick, index) => {
      let isLarge = false;
      let isActive = (index >= from && index <= to) ? 'active' : '';
      large_ticks.forEach(i => isLarge = isLarge || (index == i));
      if (isLarge) isActive += ' large';
      const theta = config.tick_degrees / config.num_ticks;
      SvgUtil.attributes(tick, {
        d: SvgUtil.pointsToPath(SvgUtil.rotatePoints(isLarge ? tickPointsLarge : tickPoints, index * theta - config.offset_degrees, [config.radius, config.radius])),
        class: isActive
      });
    });
  }

  _buildLeaf(radius) {
    const leafScale = radius / 5 / 100;
    const leafDef = ["M", 3, 84, "c", 24, 17, 51, 18, 73, -6, "C", 100, 52,
      100, 22, 100, 4, "c", -13, 15, -37, 9, -70, 19, "C", 4, 32, 0, 63, 0,
      76, "c", 6, -7, 18, -17, 33, -23, 24, -9, 34, -9, 48, -20, -9, 10,
      -20, 16, -43, 24, "C", 22, 63, 8, 78, 3, 84, "z"].map((x: number) => isNaN(x) ? x : x * leafScale).join(' ');
    const translate = [radius - (leafScale * 100 * 0.5), radius * 1.5]
    return SvgUtil.createSVGElement('path', {
      class: 'dial__ico__leaf',
      d: leafDef,
      transform: 'translate(' + translate[0] + ',' + translate[1] + ')'
    });
  }

  _buildChevrons(radius, rotation, id, scale, offset) {
    const config = this._config;
    const translation = rotation > 0 ? -1 : 1;
    const width = config.chevron_size;
    const chevron_def = ["M", 0, 0, "L", width / 2, width * 0.3, "L", width, 0].map((x: number) => isNaN(x) ? x : x * scale).join(' ');
    const translate = [radius - width / 2 * scale * translation + offset, radius + 70 * scale * 1.1 * translation];
    const chevron = SvgUtil.createSVGElement('path', {
      class: `dial__chevron dial__chevron--${id}`,
      d: chevron_def,
      transform: `translate(${translate[0]},${translate[1]}) rotate(${rotation})`
    });
    return chevron;
  }

  _buildThermoIcon(radius) {
    const thermoScale = radius / 3 / 100;
    const thermoDef = 'M 37.999 38.261 V 7 c 0 -3.859 -3.141 -7 -7 -7 s -7 3.141 -7 7 v 31.261 c -3.545 2.547 -5.421 6.769 -4.919 11.151 c 0.629 5.482 5.066 9.903 10.551 10.512 c 0.447 0.05 0.895 0.074 1.339 0.074 c 2.956 0 5.824 -1.08 8.03 -3.055 c 2.542 -2.275 3.999 -5.535 3.999 -8.943 C 42.999 44.118 41.14 40.518 37.999 38.261 Z M 37.666 55.453 c -2.146 1.921 -4.929 2.8 -7.814 2.482 c -4.566 -0.506 -8.261 -4.187 -8.785 -8.752 c -0.436 -3.808 1.28 -7.471 4.479 -9.56 l 0.453 -0.296 V 38 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 v -3 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 h -1 V 8 h 1 c 0.553 0 1 -0.447 1 -1 s -0.447 -1 -1 -1 H 26.1 c 0.465 -2.279 2.484 -4 4.899 -4 c 2.757 0 5 2.243 5 5 v 1 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 3 h -1 c -0.553 0 -1 0.447 -1 1 s 0.447 1 1 1 h 1 v 4.329 l 0.453 0.296 c 2.848 1.857 4.547 4.988 4.547 8.375 C 40.999 50.841 39.784 53.557 37.666 55.453 Z'.split(' ').map((x: any) => isNaN(x) ? x : x * thermoScale).join(' ');
    const translate = [radius - (thermoScale * 100 * 0.3), radius * 1.65]
    return SvgUtil.createSVGElement('path', {
      class: 'dial__ico__thermo',
      d: thermoDef,
      transform: 'translate(' + translate[0] + ',' + translate[1] + ')'
    });
  }

  _buildDialSlot(index) {
    return SvgUtil.createSVGElement('text', {
      class: 'dial__lbl dial__lbl--ring',
      id: `temperature_slot_${index}`
    })
  }

  _buildText(radius, name, offset) {
    const target = SvgUtil.createSVGElement('text', {
      x: radius + offset,
      y: radius,
      class: `dial__lbl dial__lbl--${name}`,
      id: name
    });
    const text = SvgUtil.createSVGElement('tspan', {
    });
    // hack
    if (name == 'target' || name == 'ambient') offset += 20;
    const superscript = SvgUtil.createSVGElement('tspan', {
      x: radius + radius / 3.1 + offset,
      y: radius - radius / 6,
      class: `dial__lbl--super--${name}`
    });
    target.appendChild(text);
    target.appendChild(superscript);
    return target;
  }

  _buildControls(radius) {
    let startAngle = 270;
    let loop = 4;
    for (let index = 0; index < loop; index++) {
      const angle = 360 / loop;
      const sector = SvgUtil.anglesToSectors(radius, startAngle, angle);
      const controlsDef = 'M' + sector.L + ',' + sector.L + ' L' + sector.L + ',0 A' + sector.L + ',' + sector.L + ' 1 0,1 ' + sector.X + ', ' + sector.Y + ' z';
      const path = SvgUtil.createSVGElement('path', {
        class: 'dial__temperatureControl',
        fill: 'blue',
        d: controlsDef,
        transform: 'rotate(' + sector.R + ', ' + sector.L + ', ' + sector.L + ')'
      });
      this._controls.push(path);
      path.addEventListener('click', () => this._temperatureControlClicked(index));
      this._root.appendChild(path);
      startAngle = startAngle + angle;
    }
  }
}
