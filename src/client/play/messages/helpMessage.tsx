import _ from 'lodash';
import Immutable from 'immutable';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as s from '../../store.model';
import * as StoreProvider from '../../storeProvider';
import * as w from '../../../game/world.model';
import { isMobile } from '../../core/userAgent';
import Button from '../../controls/button';

interface OwnProps {
}
interface Props extends OwnProps {
    userId: string;
    myHeroId: string;
    showingHelp: boolean;
    rebindings: KeyBindings;
}
interface State {
}

function stateToProps(state: s.State): Props {
    const world = state.world;
    return {
        userId: state.userId,
        myHeroId: world.ui.myHeroId,
        showingHelp: state.showingHelp,
        rebindings: state.rebindings,
    };
}

class HelpMessage extends React.PureComponent<Props, State> {
    render() {
        if (!this.props.myHeroId) {
            return null; // Observer doesn't need instructions
        }

        if (this.props.userId) {
            return null; // Logged-in user doesn't need instructions
        }

        if (this.props.showingHelp) {
            const closeLink =
                <div className="action-row">
                    <Button className="btn" onClick={(e) => this.onCloseHelpClicked(e)}>OK</Button>
                </div>;

            if (isMobile) {
                const isSingleTapShoot = this.props.rebindings[w.SpecialKeys.SingleTap] === "q";
                const isDoubleTapDash = this.props.rebindings[w.SpecialKeys.DoubleTap] === "a";
                return <div className="help-box dialog-panel">
                    <div className="help-title">How to play:</div>
                    <div className="help-row"><span className="icon-container"><i className="fas fa-crosshairs" /></span> <b>Drag</b> to move/aim</div>
                    {isSingleTapShoot && <div className="help-row"><span className="icon-container"><i className="fas fa-hand-pointer" /></span> <b>Tap</b> to shoot</div>}
                    {isDoubleTapDash && <div className="help-row"><span className="icon-container"><i className="fas fa-forward" /></span> <b>Double-tap</b> to dash</div>}
                    {closeLink}
                </div>
            } else {
                const isLeftClickShoot = this.props.rebindings[w.SpecialKeys.LeftClick] === "q";
                const isRightClickDash = this.props.rebindings[w.SpecialKeys.RightClick] === "a";
                const showMouseHint = !(isLeftClickShoot || isRightClickDash);
                return <div className="help-box dialog-panel">
                    <div className="help-title">How to play:</div>
                    {showMouseHint && <div className="help-row"><span className="icon-container"><i className="fa fa-crosshairs" /></span> <b>Mouse</b> to move/aim</div>}
                    {isLeftClickShoot && <div className="help-row"><span className="icon-container"><i className="fa fa-mouse-pointer" /></span> <b>Left-click</b> to shoot</div>}
                    {isRightClickDash && <div className="help-row"><span className="icon-container"><i className="fa fa-forward" /></span> <b>Right-click</b> to dash</div>}
                    <div className="help-row"><span className="icon-container"><i className="fa fa-keyboard" /></span> <b>Keyboard</b> to cast spells</div>
                    {closeLink}
                </div>
            }
        } else {
            return null;
        }
    }

    private onCloseHelpClicked(e: React.MouseEvent) {
        StoreProvider.dispatch({ type: "updateShowingHelp", showingHelp: false });
    }
}

export default ReactRedux.connect(stateToProps)(HelpMessage);