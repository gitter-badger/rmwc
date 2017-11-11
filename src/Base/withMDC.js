// @flow
import * as React from 'react';
import ReactDOM from 'react-dom';
import { noop } from './noop';

export type WithMDCPropsT = {
  apiRef: Object => mixed
};

type WithMDCOpts = {
  mdcConstructor?: Function,
  mdcEvents?: Object,
  mdcElementRef?: boolean,
  defaultProps?: Object,
  onMount?: () => mixed,
  onUpdate?: (currentProps: ?Object, nextProps: Object, api: ?Object) => mixed
};

/**
 * HOC that adds ripples to any component
 */
export const withMDC = ({
  mdcConstructor: MDCConstructor,
  mdcEvents = {},
  mdcElementRef = false,
  defaultProps = {},
  onMount = noop,
  onUpdate = noop
}: WithMDCOpts) => (
  Component: React.ComponentType<any>
): React.ComponentType<any> => {
  return class extends React.Component<WithMDCPropsT> {
    static defaultProps = {
      apiRef: noop,
      ...defaultProps
    };

    mdcApi = undefined;
    mdcListeners = [];
    mdcRootElement = undefined;
    elementRefProps = {};

    constructor(props) {
      super(props);
      this.mdcSetRootElement = this.mdcSetRootElement.bind(this);
      this.elementRefProps = mdcElementRef ?
        {
          mdcElementRef: this.mdcSetRootElement
        } :
        {};
    }

    componentDidMount(): void {
      this.mdcComponentInit();
    }

    componentWillUpdate(nextProps: WithMDCPropsT) {
      onUpdate(this.props, nextProps, this.mdcApi);
    }

    componentWillUnmount() {
      this.mdcComponentDestroy();
    }

    mdcComponentInit() {
      if (MDCConstructor) {
        const el = this.mdcGetRootElement();

        // a stupid hack for the test environment where this ends up undefined
        if (process.env.NODE_ENV === 'test') {
          if (el) {
            el.dataset = {};
          }
        }

        this.mdcApi = new MDCConstructor(el);
        this.props.apiRef(this.mdcApi);
      }
      onMount();

      Object.entries(mdcEvents).forEach(([eventName, handler]) => {
        this.mdcRegisterListener(eventName, handler);
      });

      onUpdate(undefined, this.props, this.mdcApi);
    }

    mdcComponentReinit() {
      this.mdcComponentDestroy();
      this.mdcComponentInit();
    }

    mdcComponentDestroy() {
      this.mdcUnregisterAllListeners();
      this.mdcApi && this.mdcApi.destroy();
    }

    mdcRegisterListener(
      eventName: string,
      func: (Event, Object, Object) => mixed
    ) {
      const wrappedHandler = (evt: Event) => func(evt, this.props, this.mdcApi);
      this.mdcApi && this.mdcApi.listen(eventName, wrappedHandler);
      this.mdcListeners.push(
        () => this.mdcApi && this.mdcApi.unlisten(eventName, wrappedHandler)
      );
    }

    mdcUnregisterAllListeners() {
      this.mdcListeners.forEach(unlisten => unlisten());
      this.mdcListeners.length = 0;
    }

    mdcSetRootElement(el: HTMLElement): HTMLElement {
      this.mdcRootElement = el;
      return el;
    }

    mdcGetRootElement() {
      return this.mdcRootElement || ReactDOM.findDOMNode(this);
    }

    mdcHandleProps(props, isInitialMount) {
      // Use this in the consumer to handle any api props that have changed
    }

    mdcComponentDidMount() {
      // Use this in the consumer to handle registering any listeners for mdc
    }

    render() {
      const { apiRef, ...rest } = this.props;

      return <Component {...this.elementRefProps} {...rest} />;
    }
  };
};