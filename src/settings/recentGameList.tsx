import _ from 'lodash';
import moment from 'moment';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as m from '../game/messages.model';

export interface Game {
    id: string;
    createdTimestamp: moment.Moment;
    playerNames: string[];
    numActivePlayers: number;
    joinable: boolean;
    numTicks: number;
}

interface Props {
}

interface State {
    games: Game[];
    error: string;
}

function retrieveGamesAsync() {
    return fetch('games', { credentials: "same-origin" })
        .then(res => res.json())
        .then((data: m.GameListMsg) => {
            let games = new Array<Game>();
            data.games.forEach(gameMsg => {
                games.push(msgToGame(gameMsg));
            });
            games = _.sortBy(games, (game: Game) => -game.createdTimestamp.unix());
            return games;
        })
}

function msgToGame(msg: m.GameMsg): Game {
    let playerNames = msg.playerNames;
    playerNames = playerNames.sort();
    return {
        id: msg.id,
        createdTimestamp: moment(msg.createdTimestamp),
        playerNames,
        numActivePlayers: msg.numActivePlayers,
        joinable: msg.joinable,
        numTicks: msg.numTicks,
    };
}

export class RecentGameList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            games: null,
            error: null,
        };
    }

    componentDidMount() {
        retrieveGamesAsync().then(games => {
            this.setState({ games });
        }).catch(error => {
            this.setState({ error: `${error}` });
        });
    }

    render() {
        return <div className="recent-game-list-section">
            <h1>Your recent games</h1>
            {this.state.error && <div className="error">Error loading recent games: {this.state.error}</div>}
            {!this.state.games && <div className="loading-text">Loading...</div>}
            {this.state.games && this.state.games.length === 0 && <div>No recent games</div>}
            {this.state.games && this.state.games.length > 0 && <div className="game-list">
                <table style={{width: "100%"}}>
                    <col className="timestamp" />
                    <col className="player-names" />
                    <col className="actions" />
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Players</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.games.map(game => <tr>
                            <td>{game.createdTimestamp.fromNow()}</td>
                            <td>{game.playerNames.join(", ")}</td>
                            <td><a href={"/?g=" + game.id} target="_blank">Watch <i className="fa fa-external-link-square-alt" /></a></td>
                        </tr>)}
                    </tbody>
                </table>
            </div>}
        </div>;
    }
}