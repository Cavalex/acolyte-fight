import * as _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as sockets from '../core/sockets';
import * as StoreProvider from '../storeProvider';
import { ButtonBar, Matchmaking, TicksPerSecond } from '../../game/constants';
import PlayButton from './playButton';
import TextMessageBox from './textMessageBox';
import { isMobile } from '../core/userAgent';
import { PlayerName } from './playerNameComponent';
import { worldInterruptible } from '../core/matches';

interface Props {
    isNewPlayer: boolean;
    myGameId: string;
    myHeroId: string;
    isDead: boolean;
    isFinished: boolean;
    buttonBar: w.ButtonConfig;
    options: s.GameOptions;
    exitable: boolean;
    items: s.NotificationItem[];
}
interface State {
    spectatingGameId: string;
}

function stateToProps(state: s.State): Props {
    return {
        isNewPlayer: state.isNewPlayer,
        myGameId: state.world.ui.myGameId,
        myHeroId: state.world.ui.myHeroId,
        isDead: !state.world.objects.has(state.world.ui.myHeroId),
        isFinished: state.world.activePlayers.size === 0,
        buttonBar: state.world.ui.buttonBar,
        options: state.options,
        exitable: worldInterruptible(state.world),
        items: state.items,
    };
}

class MessagesPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            spectatingGameId: null,
        };
    }

    render() {
        // Offset the messages from the button bar
        let bottom = 0;
        let left: number = undefined;
        let right: number = undefined;
        const buttonBar = this.props.buttonBar;
        if (buttonBar) {
            if (buttonBar.view === "bar") {
                left = 0;
                bottom = ButtonBar.Size * buttonBar.scaleFactor + ButtonBar.Margin * 2;
            } else if (buttonBar.view === "wheel") {
                if (this.props.options.wheelOnRight) {
                    // Wheel is right-aligned, put messages to the left
                    left = 0;
                } else {
                    // Wheel is left-aligned, put messages to the right
                    right = 0;
                }
            }
        }

        let finished = false;

        let actionRow: JSX.Element = this.renderHelp("help");
        if (this.props.myGameId !== this.state.spectatingGameId && this.props.myHeroId && this.props.isDead) {
            actionRow = this.renderDead("dead", this.props.myGameId);
            finished = true;
        } else if (this.props.isFinished) {
            actionRow = this.renderFinished("finished");
            finished = true;
        }

        let rows = new Array<JSX.Element>();
        const now = new Date().getTime();
        this.props.items.forEach(item => {
            if (now >= item.expiryTime) {
                return;
            }

            const row = this.renderNotification(item.key, item.notification);
            if (!row) {
                return;
            }

            if (item.notification.type === "win") {
                actionRow = row;
                finished = true;
            } else {
                rows.push(row);
            }
        });

        if (finished) {
            rows.push(<div key="advert-row" className="row advert-row">
                <span className="label" style={{ marginRight: 5 }}>Like this game?</span>
                <a href="https://discord.gg/sZvgpZk" target="_blank" title="Chat on Discord!"><span className="label">Join the community on Discord</span><i className="fab fa-discord" /></a>
            </div>);
        }

        if (actionRow) {
            rows.push(actionRow);
        }

        return <div id="messages-panel" style={{ left, right, bottom }}>
            {rows}
            <TextMessageBox />
        </div>;
    }

    private renderNotification(key: string, notification: w.Notification) {
        switch (notification.type) {
            case "disconnected": return this.renderDisconnectedNotification(key, notification);
            case "replayNotFound": return this.renderReplayNotFoundNotification(key, notification);
            case "text": return this.renderTextNotification(key, notification);
            case "new": return this.renderNewGameNotification(key, notification);
            case "closing": return this.renderClosingNotification(key, notification);
            case "join": return this.renderJoinNotification(key, notification);
            case "bot": return this.renderBotNotification(key, notification);
            case "leave": return this.renderLeaveNotification(key, notification);
            case "kill": return this.renderKillNotification(key, notification);
            case "win": return this.renderWinNotification(key, notification);
            default: return null; // Ignore this notification
        }
    }

    private renderDisconnectedNotification(key: string, notification: w.DisconnectedNotification) {
        return <div key={key} className="row error">Disconnected from server. Exit the game and try again.</div>
    }

    private renderReplayNotFoundNotification(key: string, notification: w.ReplayNotFoundNotification) {
        return <div key={key} className="row error">Replay not found.</div>
    }

    private renderNewGameNotification(key: string, notification: w.NewGameNotification) {
        return <div key={key} className="row">
            <div>
                {notification.numPlayersInGameMode} {notification.numPlayersInGameMode === 1 ? "player" : "players"}
                {notification.isPrivate ? ` in this game mode (${notification.numPlayersPublic} in public games)` : " online"}
            </div>
            {this.props.exitable && !notification.isPrivate && notification.numPlayersPublic <= 1 && <div>You might find players on <a href="/regions" onClick={(ev) => this.onRegionsLinkClick(ev)}>other regions</a>.</div>}
            {this.props.exitable && !notification.isPrivate && notification.numPlayersPublic > 1 && <div>Would you like to <a href="/#watch" onClick={(ev) => this.onWatchLiveClick(ev)}>watch the other players</a>?</div>}
        </div>
    }

    private onRegionsLinkClick(ev: React.MouseEvent) {
        ev.preventDefault();
        matches.leaveCurrentGame(true);
        pages.changePage("regions");
    }

    private onWatchLiveClick(ev: React.MouseEvent) {
        ev.preventDefault();
        matches.watchLiveGame();
    }

    private renderHelp(key: string) {
        if (!this.props.myHeroId) {
            return null; // Observer doesn't need instructions
        }

        if (this.props.isNewPlayer) {
            const closeLink =
                <div className="action-row">
                    <span className="btn" onClick={(e) => this.onCloseHelpClicked(e)}>OK</span>
                </div>;

            const help =
                isMobile
                ? (
                    <div className="help-box">
                        <div className="help-title">How to play:</div>
                        <div className="help-row"><span className="icon-container"><i className="fas fa-crosshairs" /></span> <b>Touch</b> to move/aim</div>
                        <div className="help-row"><span className="icon-container"><i className="fas fa-hand-pointer" /></span> <b>Double-tap</b> to dash</div>
                        {closeLink}
                    </div>
                )
                : (
                    <div className="help-box">
                        <div className="help-title">How to play:</div>
                        <div className="help-row"><span className="icon-container"><i className="fa fa-crosshairs" /></span> <b>Mouse</b> to move/aim</div>
                        <div className="help-row"><span className="icon-container"><i className="fa fa-keyboard" /></span> <b>Keyboard</b> to cast spells</div>
                        {closeLink}
                    </div>
                );
            return help;
        } else {
            return null;
        }
    }

    private onCloseHelpClicked(e: React.MouseEvent) {
        StoreProvider.dispatch({ type: "clearNewPlayerFlag" });
    }

    private renderTextNotification(key: string, notification: w.TextNotification) {
        return <div key={key} className="row text-row"><PlayerName player={notification.player} myHeroId={this.props.myHeroId} />: <span className="text-message">{notification.text}</span></div>
    }

    private renderClosingNotification(key: string, notification: w.CloseGameNotification) {
        if (notification.ticksUntilClose <= 0) {
            return <div key={key} className="row game-started">Game started</div>
        } else if (notification.ticksUntilClose <= Matchmaking.JoinPeriod) {
            return null;
        } else {
            return <div key={key} className="row game-started">Waiting {notification.ticksUntilClose / TicksPerSecond} seconds for up to {Math.ceil(Matchmaking.MaxPlayers / 2)} players to join...</div>
        }
    }

    private renderJoinNotification(key: string, notification: w.JoinNotification) {
        return <div key={key} className="row"><PlayerName player={notification.player} myHeroId={this.props.myHeroId} /> joined</div>
    }

    private renderBotNotification(key: string, notification: w.BotNotification) {
        return <div key={key} className="row"><PlayerName player={notification.player} myHeroId={this.props.myHeroId} /> joined</div>
    }

    private renderLeaveNotification(key: string, notification: w.LeaveNotification) {
        return <div key={key} className="row"><PlayerName player={notification.player} myHeroId={this.props.myHeroId} /> left</div>
    }

    private renderKillNotification(key: string, notification: w.KillNotification) {
        if (!notification.killed) {
            return null;
        }

        if (notification.killer) {
            return <div key={key} className="row">
                {notification.killer && <span key="killer"><PlayerName player={notification.killer} myHeroId={this.props.myHeroId} /> killed </span>}
                {notification.killed && <span key="killed"><PlayerName player={notification.killed} myHeroId={this.props.myHeroId} /> </span>}
                {notification.assist && <span key="assist">assist <PlayerName player={notification.assist} myHeroId={this.props.myHeroId} /> </span>}
            </div>
        } else {
            return <div key={key} className="row"><PlayerName player={notification.killed} myHeroId={this.props.myHeroId} /> died</div>
        }
    }

    private renderWinNotification(key: string, notification: w.WinNotification) {
        return <div key={key} className="winner">
            <div className="winner-row"><PlayerName player={notification.winner} myHeroId={this.props.myHeroId} /> is the winner!</div>
            <div className="award-row">Most damage: <PlayerName player={notification.mostDamage} myHeroId={this.props.myHeroId} /> ({notification.mostDamageAmount.toFixed(0)})</div>
            <div className="award-row">Most kills: <PlayerName player={notification.mostKills} myHeroId={this.props.myHeroId} /> ({notification.mostKillsCount} kills)</div>
            <div className="action-row">
                {this.renderAgainButton()}
            </div>
        </div>;
    }

    private renderAgainButton() {
        return <PlayButton again={!!this.props.myHeroId} />;
    }
    
    private renderDead(key: string, spectatingGameId: string) {
        return <div key={key} className="winner">
            <div className="winner-row">You died.</div>
            <div className="action-row">
                <div style={{ marginBottom: 12 }}>
                    <b><a href="#" onClick={() => this.setState({ spectatingGameId })}>Continue Watching</a></b> or
                </div>
                <div>
                    {this.renderAgainButton()}
                </div>
            </div>
        </div>;
    }

    private renderFinished(key: string) {
        return <div key={key} className="winner">
            <div className="winner-row">Game finished.</div>
            <div className="action-row">
                {this.renderAgainButton()}
            </div>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(MessagesPanel);