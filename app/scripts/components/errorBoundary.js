import React from 'react';

let Sentry;

class ErrorBoundary extends React.Component {
  static defaultProps = {
    Sentry: null
  };
  constructor(props) {
    super(props);

    this.state = {
      error: null,
      eventId: null
    };
  }

  componentDidMount() {
    Sentry = this.props.Sentry
  }

  componentDidCatch(error, errorInfo) {
    this.setState({error});

    if (!Sentry) return;

    Sentry.withScope((scope) => {
      scope.setExtras(errorInfo);
      const eventId = Sentry.captureException(error);
      this.setState({eventId});
    });
  }

  handleClick = () => {
    Sentry.showReportDialog({eventId: this.state.eventId});
  }

  render() {
    if (Sentry && this.state.error) {
      return <a onClick={this.handleClick}>Report feedback</a>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
