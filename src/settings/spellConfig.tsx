import * as React from 'react';
import * as c from '../game/world.model';
import { ButtonBar, Choices, Spells } from '../game/constants';
import { SpellIcon } from './spellIcon';
import * as Storage from '../ui/storage';

interface Props {
}

interface State {
    config: c.KeyBindings;
    saved: Set<string>;
}

export class SpellConfig extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            config: Storage.loadKeyBindingConfig() || Choices.Defaults,
            saved: new Set<string>(),
        };
    }

    render() {
        return <div className="spell-config">
            <h1>Your Spell Configuration</h1>
            {ButtonBar.Keys.map(key => this.renderKey(key))}
        </div>;
    }

    private renderKey(key: string) {
        if (!key) {
            return null;
        }

        const options = Choices.Options[key];
        const chosen = this.state.config[key] || Choices.Defaults[key];
        const chosenSpell = Spells.all[chosen];
        return <div className="key">
            <div className="key-options">
                {options.map(spellId =>
                    <SpellIcon
                        className={spellId === chosen ? "spell-icon-chosen" : "spell-icon-not-chosen"}
                        spellId={spellId}
                        title={this.capitalize(spellId)}
                        onClick={() => this.onChoose(key, spellId)}
                        size={48} />)}
            </div>
            <div className="key-detail">
                <div className="spell-name">{chosenSpell.name || chosenSpell.id}</div>
                <div className="description">{chosenSpell.description}</div>
                {this.state.saved.has(key) && <div className="key-saved">Your {key.toUpperCase()} spell will be {this.capitalize(chosen)} in your next game.</div>}
            </div>
            <div className="key-name-container">
                <div className="key-name">{key}</div>
            </div>
        </div>;
    }
    
    private onChoose(key: string, spellId: string) {
        const config = this.state.config;
        const saved = this.state.saved;

        config[key] = spellId;
        saved.add(key);

        this.setState({ config, saved });
        Storage.saveKeyBindingConfig(config);
    }

    private capitalize(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}