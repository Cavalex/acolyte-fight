import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as cloud from '../core/cloud';
import * as matches from '../core/matches';
import * as pages from '../core/pages';
import * as storage from '../storage';
import * as url from '../url';

interface OwnProps {
    category: string;
}
interface Props extends OwnProps {
    current: s.PathElements;
    myUserId: string;
}

interface State {
    category: string;
    leaderboard: m.LeaderboardPlayer[];
    error: string;
}

async function retrieveLeaderboardAsync(category: string) {
    const res = await fetch(`api/leaderboard?category=${encodeURIComponent(category)}&limit=100`, {
        credentials: 'same-origin'
    });
    const json = await res.json() as m.GetLeaderboardResponse;
    return json.leaderboard;
}

function stateToProps(state: s.State, ownProps: OwnProps): Props {
    return {
        ...ownProps,
        current: state.current,
        myUserId: state.userId,
    };
}

class LeaderboardPanel extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            category: null,
            leaderboard: null,
            error: null,
        };
    }

    componentWillMount() {
        this.loadDataAsync(this.props.category);
    }

    componentWillReceiveProps(newProps: Props) {
        const category = newProps.category;
        this.loadDataAsync(category);
    }

    private async loadDataAsync(category: string) {
        if (category !== this.state.category) {
            this.setState({ category, leaderboard: null, error: null });
            try {
                const leaderboard = await retrieveLeaderboardAsync(category);
                if (category === this.state.category) {
                    this.setState({ leaderboard });
                }
            } catch(error) {
                console.error("LeaderboardPanel error", error);
                this.setState({ error: `${error}` });
            }
        }
    }

    render() {
        if (this.state.error) {
            return this.renderError();
        } else if (!this.state.leaderboard) {
            return this.renderLoading();
        } else {
            return this.renderLeaderboard();
        }
    }

    private renderLeaderboard() {
        return <div>
            <h1>Leaderboard</h1>
            <div className="leaderboard">
                {this.state.leaderboard.map((player, index) => this.renderRow(player, index))}
            </div>
        </div>
    }

    private renderRow(player: m.LeaderboardPlayer, index: number) {
        return <div className={player.userId === this.props.myUserId ? "leaderboard-row leaderboard-self" : "leaderboard-row"}>
            <span className="position">{index + 1}</span>
            {this.renderPlayerName(player)}
            <span className="win-count" title={`${player.rd} ratings deviation`}>{Math.round(player.lowerBound)} rating <span className="leaderboard-num-games">({player.numGames} games)</span></span>
        </div>
    }

    private renderPlayerName(player: m.LeaderboardPlayer) {
        if (player.userId) {
            const playerUrl = url.getPath({ ...this.props.current, page: "profile", profileId: player.userId });
            return <span className="player-name">
                <a href={playerUrl} onClick={(ev) => this.onPlayerClick(ev, player.userId)}>{player.name}</a>
            </span>
        } else {
            return <span className="player-name">{player.name}</span>
        }
    }

    private onPlayerClick(ev: React.MouseEvent, userId: string) {
        if (userId) {
            ev.preventDefault();
            pages.changePage("profile", userId);
        }
    }

    private renderLoading() {
        return <div>
            <h1>Leaderboard</h1>
            <p className="loading-text">Loading...</p>
        </div>
    }

    private renderError() {
        return <div>
            <h1>Leaderboard</h1>
            <p className="error">Unable to load leaderboard: {this.state.error}</p>
        </div>
    }
}

export default ReactRedux.connect(stateToProps)(LeaderboardPanel);