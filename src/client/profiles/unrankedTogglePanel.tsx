import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as options from '../options';
import * as cloud from '../core/cloud';
import * as pages from '../core/pages';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

interface Props {
    unranked: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    return {
        unranked: state.options.unranked,
    };
}

export class UnrankedTogglePanel extends React.Component<Props, State> {
    private uploadSettingsDebounced = _.debounce(() => cloud.uploadSettings(), 200);

    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return this.props.unranked ? this.renderUnranked() : this.renderRanked();
    }

    private renderUnranked() {
        return <div>
            <h2><i className="fas fa-gamepad" /> Unranked Mode</h2>
            <p>You are currently playing unranked. Play for fun, not points! You will not lose or gain points on the rating system.</p>
            <div className="btn" onClick={() => this.onToggleClick()}>Switch to <i className="fas fa-trophy-alt" /> Ranked Mode</div>
        </div>
    }

    private renderRanked() {
        return <div>
            <h2><i className="fas fa-trophy-alt" /> Ranked Mode</h2>
            <p>You are currently playing ranked. You will gain and lose points on the rating system.</p>
            <div className="btn" onClick={() => this.onToggleClick()}>Switch to <i className="fas fa-gamepad" /> Unranked Mode</div>
        </div>
    }

    private onToggleClick() {
        StoreProvider.dispatch({
            type: "updateOptions",
            options: {
                unranked: !this.props.unranked,
            },
        });
        this.uploadSettingsDebounced();
    }
}

export default ReactRedux.connect(stateToProps)(UnrankedTogglePanel);