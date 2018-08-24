import * as _ from 'lodash';
import * as React from 'react';
import * as PlayerName from '../game/playerName';
import * as Storage from '../client/storage';

interface Props {
}

interface State {
    name: string;
    changed: boolean;
    saved: boolean;
}

export class NameConfig extends React.Component<Props, State> {
    private saveStateDebounced = _.debounce(() => this.saveState(), 200);

    constructor(props: Props) {
        super(props);
        this.state = {
            name: Storage.loadName(),
            changed: false,
            saved: true,
        }
    }
    render() {
        return <div>
            <h1>Your Name</h1>
            <div><input type="text" value={this.state.name} maxLength={PlayerName.MaxPlayerNameLength} onChange={(e) => this.onChange(e)} /></div>
            {this.state.changed && <div style={{ marginTop: 8 }}>
                {this.state.saved 
                    ? "Your name has been set to " + this.state.name
                    : "Unsaved changes"}
            </div>}
        </div>;
    }

    private onChange(ev: React.ChangeEvent<HTMLInputElement>) {
        this.setState({
            name: PlayerName.sanitizeName(ev.target.value),
            changed: true,
            saved: false,
        });
        this.saveStateDebounced();
    }

    private saveState() {
        Storage.saveName(this.state.name);
        this.setState({
            saved: true,
        });
    }
}