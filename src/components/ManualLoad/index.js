import React, { Component } from "react";
import PropTypes from "prop-types";
import Media from "../Media";
import { icons, loadStates } from "../constants";
import defaultIcons from "../defaultIcons";

const { initial, loading, loaded, error } = loadStates;

export default class ManualLoad extends Component {
  static propTypes = {
    /** URL of the image */
    src: PropTypes.string.isRequired,
    /** Width of the image in px */
    width: PropTypes.number.isRequired,
    /** Height of the image in px */
    height: PropTypes.number.isRequired,
    /** [Low Quality Image Placeholder](https://github.com/zouhir/lqip) */
    lqip: PropTypes.string.isRequired,
    /** Solid color placeholder */
    // color: PropTypes.string.isRequired,
    /** Alternative text */
    alt: PropTypes.string,
    /** If you will not pass this value, component will detect onLine status based on browser API, otherwise will use passed value */
    onLine: PropTypes.bool,
    /** If you will pass true it will immediately load image otherwise load will be controlled by user */
    load: PropTypes.bool,
    /** Color of the icon */
    iconColor: PropTypes.string,
    /** Size of the icon in px */
    iconSize: PropTypes.number,
    /** CSS class which will hide elements if JS is disabled */
    noscript: PropTypes.string,
    /** React's style attribute for root element of the component */
    style: PropTypes.object,
    /** React's className attribute for root element of the component */
    className: PropTypes.string,
    /** callback for load state change */
    onLoadStateChange: PropTypes.func,
    /** how much to wait in ms until concider download to slow */
    threshold: PropTypes.number
  };

  static defaultProps = {
    interval: 500
  };

  constructor(props) {
    super(props);
    const controledOnLine = props.onLine !== undefined;
    const controledLoad = props.load !== undefined;
    this.state = {
      onLine: controledOnLine ? props.onLine : true,
      controledLoad,
      controledOnLine,
      loadState: initial,
      overThreshold: false
    };
  }

  componentDidMount() {
    if (this.props.load) this.load();
    if (!this.state.controledOnLine) {
      this.updateOnlineStatus = () =>
        this.setState({ onLine: navigator.onLine });
      this.updateOnlineStatus();
      window.addEventListener("online", this.updateOnlineStatus);
      window.addEventListener("offline", this.updateOnlineStatus);
    }
  }

  componentWillUnmount() {
    this.clear();
    if (!this.state.controledOnLine) {
      window.removeEventListener("online", this.updateOnlineStatus);
      window.removeEventListener("offline", this.updateOnlineStatus);
    }
  }

  // TODO: fix this
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.state.controledLoad && nextProps.load === undefined) {
      throw new Error("You should pass load value to controlled component");
    }
    if (this.state.controledOnLine) {
      if (nextProps.onLine === undefined) {
        throw new Error("You should pass onLine value to controlled component");
      } else {
        this.setState({ onLine: nextProps.onLine });
      }
    }
    if (nextProps.load === true) this.load();
    if (nextProps.load === false) this.cancel();
    if (nextProps.src !== this.props.src) this.cancel();
  }

  onClick() {
    const { loadState, onLine, overThreshold } = this.state;
    if (!onLine) return;
    switch (loadState) {
      case loading:
        if (overThreshold) this.cancel();
        return;
      case loaded:
        // nothing
        return;
      case initial:
      case error:
        this.load();
        return;
      default:
        throw new Error(`Wrong state: ${loadState}`);
    }
  }

  clear() {
    let image = this.image;
    if (this.image) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = undefined;
      image.onabort = image.onerror = image.onload = undefined;
      this.image.src = "";
      this.image = image = undefined;
    }
  }

  cancel() {
    const { loadState } = this.state;
    if (loading !== loadState) return;
    this.clear();
    this.loadStateChange(initial);
  }

  loadStateChange(loadState) {
    this.setState({ loadState, overThreshold: false });
    const onLoadStateChange = this.props.onLoadStateChange;
    if (onLoadStateChange) onLoadStateChange(loadState);
  }

  startTimer() {
    const { size, threshold } = this.props;
    const startTime = new Date().getTime();
    return setInterval(() => {
      const time = new Date().getTime() - startTime;
      // dynamic treshold based on size?
      if (threshold && time > threshold) this.setState({ overThreshold: true });
      window.document.dispatchEvent(
        new CustomEvent("connection", {
          detail: { time, size, overThreshold: threshold && time > threshold }
        })
      );
    }, this.props.interval);
  }

  load() {
    const { loadState } = this.state;
    if (loaded === loadState || loading === loadState) return;
    this.loadStateChange(loading);
    this.refreshIntervalId = this.startTimer();
    const image = new Image();
    image.onload = () => {
      this.clear();
      this.loadStateChange(loaded);
    };
    image.onabort = image.onerror = () => {
      this.clear();
      this.loadStateChange(error);
    };
    image.src = this.props.src;
    this.image = image;
  }

  stateToIcon({ loadState, onLine, overThreshold }) {
    switch (loadState) {
      case loaded:
        return icons.loaded;
      case loading:
        // TODO: slow-loading icon
        return overThreshold ? icons.loading : icons.loading;
      case initial:
        return onLine ? icons.load : icons.offline;
      case error:
        return onLine ? icons.error : icons.offline;
      default:
        throw new Error(`Wrong state: ${loadState}`);
    }
  }

  render() {
    let icon;
    if (this.props.stateToIcon) icon = this.props.stateToIcon(this.state);
    if (!icon) icon = this.stateToIcon(this.state);
    return (
      <Media
        {...this.props}
        onClick={() => this.onClick()}
        icon={icon}
        icons={defaultIcons}
      />
    );
  }
}
