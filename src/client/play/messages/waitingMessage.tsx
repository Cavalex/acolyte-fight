import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as matches from '../../core/matches';
import * as pages from '../../core/pages';
import * as segments from '../../../shared/segments';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';
import * as w from '../../../game/world.model';
import { worldInterruptible } from '../../core/matches';
import Button from '../../controls/button';

interface OwnProps {
}
interface Props extends OwnProps {
    myHeroId: number;
    isWaiting: boolean;
    segment: string;
    locked: string;
    numOnline: number;
    numHumans: number;
    numPlayers: number;
    exitable: boolean;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    return {
        myHeroId: world.ui.myHeroId,
        isWaiting: world.tick < state.world.startTick,
        segment: state.onlineSegment,
        locked: state.world.ui.locked,
        numOnline: state.online.size,
        numHumans: state.world.activePlayers.size,
        numPlayers: state.world.players.size,
        exitable: worldInterruptible(state.world),
    };
}

class WaitingMessage extends React.PureComponent<Props, State> {
    render() {
        if (this.props.locked === m.LockType.Tutorial) {
            return null; // Tutorial handled elsewhere
        } else {
            return this.renderOnline();
        }
    }

    private renderOnline() {
        if (!(this.props.myHeroId && this.props.isWaiting && this.props.numHumans <= 1)) {
            return null;
        }

        const numOnline = this.props.numOnline;
        const isPublic = this.props.segment === segments.publicSegment();
        return <div className="info-panel dialog-panel">
            <div className="header-row loading-text">Waiting for opponents...</div>
            <div className="body-row">
                {numOnline} {numOnline === 1 ? "player" : "players"} online{!isPublic && " in this game mode"}.
                {' '}
                {this.props.exitable && numOnline <= 1 && <>You might find players on <Button className="link-btn" onClick={() => this.onRegionsLinkClick()}>other regions</Button>.</>}
                {this.props.exitable && numOnline > 1 && <>Would you like to <Button className="link-btn" onClick={() => this.onWatchLiveClick()}>watch the other players</Button>?</>}
            </div>
            {this.props.numPlayers <= 1 && <div className="action-row">
                <Button onClick={() => matches.addBotToCurrentGame()}>Play vs AI</Button>
            </div>}
        </div>
    }

    private onRegionsLinkClick() {
        matches.leaveCurrentGame(true);
        pages.changePage("regions");
    }

    private onWatchLiveClick() {
        matches.leaveCurrentGame(false);
        matches.watchLiveGame(true);
    }
}

export default ReactRedux.connect(stateToProps)(WaitingMessage);