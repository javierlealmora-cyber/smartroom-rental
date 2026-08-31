import React from 'react';

export class WebChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (this.props.onError) this.props.onError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 text-sm text-red-600 text-center">
          {this.props.fallback ?? 'El chat no está disponible en este momento.'}
        </div>
      );
    }
    return this.props.children;
  }
}
