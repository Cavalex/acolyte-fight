import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';

import * as modding from '../modding';
import * as StoreProvider from '../storeProvider';

import AboutSection from './aboutSection';
import DebugPanel from './debugPanel';
import GamePanel from '../play/gamePanel';
import HomePanel from './homePanel';
import LeaderboardPanel from '../profiles/leaderboardPanel';
import PartyPanel from './partyPanel';
import PrivacyPolicyPanel from './privacyPolicyPanel';
import ProfilePanel from '../profiles/profilePanel';
import RecordPanel from '../play/recordPanel';
import SettingsPanel from './settingsPanel';
import SpellFrequenciesPanel from './spellFrequenciesPanel';
import SkinEditorPage from '../skins/SkinEditorPage';
import TitleListener from '../controls/titleListener';
import NavBar from '../nav/navbar';
import RegionsPanel from './regionsPanel';
import UrlListener from '../controls/urlListener';
import WatchPanel from './watchPanel';

import ModdingOverviewTab from '../modding/overviewTab';
import IconEditor from '../modding/iconEditor';
import MapEditor from '../modding/mapEditor';
import ObstacleEditor from '../modding/obstacleEditor';
import SoundEditor from '../modding/soundEditor';
import SpellEditor from '../modding/spellEditor';
import ConstantEditor from '../modding/constantEditor';

interface Props {
    myGameId: string;
    current: s.PathElements;
    touched: boolean;
}

function stateToProps(state: s.State): Props {
    return {
        myGameId: state.world.ui.myGameId,
        current: state.current,
        touched: state.touched,
    };
}

class Root extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
        this.state = {
        };
    }

    render() {
        if (this.props.myGameId) {
            return this.renderGame();
        } else if (this.props.current.recordId) {
            return this.renderRecord();
        } else {
            return this.renderPage();
        }
    }

    private renderGame() {
        return <GamePanel />;
    }

    private renderRecord() {
        return <RecordPanel />;
    }

    private renderPage() {
        const page = this.props.current.page;
        return (
            <div className="root-panel"
                onTouchStart={() => this.onTouchStart()}
                onDragOver={ev => this.onDragOver(ev)}
                onDrop={ev => this.onDrop(ev)}
                >

                {page === "" && this.renderHome()}
                {page === "debug" && this.renderDebug()}
                {page === "leaderboard" && this.renderLeaderboard()}
                {page === "party" && this.renderParty()}
                {page === "regions" && this.renderRegions()}
                {page === "about" && this.renderAbout()}
                {page === "profile" && this.renderProfile()}
                {page === "settings" && this.renderSettings()}
                {page === "statistics" && this.renderStatistics()}
                {page === "watch" && this.renderWatch()}
                {page === "privacy" && this.renderPrivacy()}
                {page === "modding" && <ModdingOverviewTab />}
                {page === "modding-spells" && <SpellEditor />}
                {page === "modding-icons" && <IconEditor />}
                {page === "modding-sounds" && <SoundEditor />}
                {page === "modding-maps" && <MapEditor />}
                {page === "modding-obstacles" && <ObstacleEditor />}
                {page === "modding-constants" && <ConstantEditor />}
                {page === "skin-editor" && <SkinEditorPage />}
                <UrlListener />
            </div>
        );
    }

    private async onDragOver(ev: React.DragEvent) {
        ev.preventDefault();
        ev.stopPropagation();
    }

    private async onDrop(ev: React.DragEvent) {
        ev.preventDefault();
        ev.stopPropagation();

        if (ev.dataTransfer.items && ev.dataTransfer.items[0]) {
            const file = ev.dataTransfer.items[0].getAsFile();
            await this.onLoadModFile(file);
        }
    }

    private async onLoadModFile(file: File) {
        try {
            const mod = await modding.loadModFile(file);
            await modding.loadModIntoGame(mod);
            await modding.loadModIntoEditor(mod);
        } catch (exception) {
            console.error("Error loading mod from file", exception);
        }
    }


    private onTouchStart() {
        if (!this.props.touched) {
            StoreProvider.dispatch({ type: "touched", touched: true });
        }
    }

    private renderHome() {
        return <HomePanel />
    }

    private renderParty() {
        return <div className="content-container">
            <TitleListener subtitle="Party" />
            <NavBar />
            <div className="page">
                <PartyPanel />
            </div>
        </div>;
    }

    private renderRegions() {
        return <div className="content-container">
            <TitleListener subtitle="Regions" />
            <NavBar />
            <div className="page">
                <RegionsPanel />
            </div>
        </div>;
    }

    private renderAbout() {
        return <div className="content-container">
            <TitleListener subtitle="About" />
            <NavBar />
            <div className="page">
                <AboutSection />
            </div>
        </div>;
    }

    private renderDebug() {
        return <div className="content-container">
            <TitleListener subtitle="Debug" />
            <NavBar />
            <div className="page">
                <DebugPanel />
            </div>
        </div>;
    }

    private renderLeaderboard() {
        return <div className="content-container">
            <TitleListener subtitle="Leaderboard" />
            <NavBar />
            <div className="page">
                <LeaderboardPanel />
            </div>
        </div>;
    }

    private renderProfile() {
        return <div className="content-container">
            <TitleListener subtitle="Profile" />
            <NavBar />
            <div className="page">
                <ProfilePanel />
            </div>
        </div>;
    }

    private renderSettings() {
        return <div className="content-container">
            <TitleListener subtitle="Settings" />
            <NavBar />
            <div className="page">
                <SettingsPanel />
            </div>
        </div>;
    }

    private renderStatistics() {
        return <div className="content-container">
            <TitleListener subtitle="Statistics" />
            <NavBar />
            <div className="page">
                <SpellFrequenciesPanel />
            </div>
        </div>;
    }

    private renderWatch() {
        return <div className="content-container">
            <TitleListener subtitle="Spectate" />
            <NavBar />
            <div className="page">
                <WatchPanel />
            </div>
        </div>;
    }

    private renderPrivacy() {
        return <div className="content-container">
            <TitleListener subtitle="Privacy Policy" />
            <NavBar />
            <div className="page">
                <PrivacyPolicyPanel />
            </div>
        </div>;
    }
}

export default ReactRedux.connect(stateToProps)(Root);