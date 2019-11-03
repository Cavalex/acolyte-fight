import _ from 'lodash';
import * as React from 'react';
import * as ReactRedux from 'react-redux';
import * as Reselect from 'reselect';
import * as m from '../../../shared/messages.model';
import * as s from '../../store.model';
import * as constants from '../../../game/constants';
import * as StoreProvider from '../../storeProvider';
import Button from '../../controls/button';
import PercentageBar from '../../controls/percentageBar';

const HistorySeconds = constants.PerformanceStats.MaxHistoryLengthMilliseconds / 1000;

enum Tab {
    None = "None",
    CPU = "CPU",
    GPU = "GPU",
    Network = "Network",
}

interface OwnProps {
}
interface Props extends OwnProps {
    cpuLag: number;
    gpuLag: number;
    networkLag: number;

    globalCpuLag: number;
    globalGpuLag: number;
    globalNetworkLag: number;
}
interface State {
    tab: Tab;
}

interface DetailProps {
    header?: React.ReactNode;
    caption?: React.ReactNode;
    children: React.ReactNode[];
}

function PerformanceTable(props: DetailProps) {
    return <div className="info-panel dialog-panel performance-panel">
        {props.header}
        <div className="body-row">
            <table className="performance-table">
                {props.caption}
                <colgroup>
                    <col className="performance-table-label-col" />
                    <col className="performance-table-percent-col" />
                </colgroup>
                <tbody>
                    {props.children}
                </tbody>
            </table>
        </div>
    </div>
}

function stateToProps(state: s.State): Props {
    return {
        cpuLag: state.performance.cpuLag,
        gpuLag: state.performance.gpuLag,
        networkLag: state.performance.networkLag,
        globalCpuLag: state.globalPerformance.cpuLag,
        globalGpuLag: state.globalPerformance.gpuLag,
        globalNetworkLag: state.globalPerformance.networkLag,
    };
}

class PerformancePanel extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            tab: Tab.None,
        };
    }

    render() {
        const tab = this.state.tab;
        switch (this.state.tab) {
            case Tab.CPU: return this.renderCPU();
            case Tab.GPU: return this.renderGPU();
            case Tab.Network: return this.renderNetwork();
            default: return this.renderSummary();
        }
    }

    private renderSummary() {
        return <PerformanceTable>
            {this.renderPerformanceRow(Tab.CPU, "CPU lag", this.props.cpuLag, this.props.globalCpuLag)}
            {this.renderPerformanceRow(Tab.GPU, "GPU lag", this.props.gpuLag, this.props.globalGpuLag)}
            {this.renderPerformanceRow(Tab.Network, "Network lag", this.props.networkLag, this.props.globalNetworkLag)}
        </PerformanceTable>
    }

    private renderPerformanceRow(tab: Tab, label: string, proportion: number, globalProportion: number) {
        return <tr title={`${label}: ${(proportion * 100).toFixed(1)}%, other players are seeing ${(globalProportion * 100).toFixed(1)}%`}>
            <td className="performance-table-label"><Button className="clickable" onClick={() => this.onTabSelect(tab)}>{label}</Button></td>
            <td className="performance-table-percent"><PercentageBar proportion={proportion} /></td>
        </tr>
    }

    private onTabSelect(tab: Tab) {
        this.setState({ tab });
    }

    private renderCPU() {
        const header = <Button className="clickable header-row" onClick={() => this.onTabClear()}><i className="fas fa-chevron-left" /> CPU</Button>;
        const caption = <caption>Proportion of frames your CPU failed to simulate in time over the past {HistorySeconds} seconds.</caption>;
        return <PerformanceTable header={header} caption={caption}>
            {this.renderDetailRow("Your CPU lag", this.props.cpuLag)}
            {this.renderDetailRow("Others CPU lag", this.props.globalCpuLag)}
        </PerformanceTable>
    }
    
    private renderGPU() {
        const header = <Button className="clickable header-row" onClick={() => this.onTabClear()}><i className="fas fa-chevron-left" /> GPU</Button>;
        const caption = <caption>Proportion of frames your GPU failed to render in time over the past {HistorySeconds} seconds.</caption>;
        return <PerformanceTable header={header} caption={caption}>
            {this.renderDetailRow("Your GPU lag", this.props.gpuLag)}
            {this.renderDetailRow("Others GPU lag", this.props.globalGpuLag)}
        </PerformanceTable>
    }
    
    private renderNetwork() {
        const header = <Button className="clickable header-row" onClick={() => this.onTabClear()}><i className="fas fa-chevron-left" /> Network</Button>;
        const caption = <caption>Proportion of frames your Network failed to receive in time over the past {HistorySeconds} seconds.</caption>;
        return <PerformanceTable header={header} caption={caption}>
            {this.renderDetailRow("Your network lag", this.props.networkLag)}
            {this.renderDetailRow("Others network lag", this.props.globalNetworkLag)}
        </PerformanceTable>
    }

    private renderDetailRow(label: string, proportion: number) {
        return <tr>
            <td className="performance-table-label">{label}</td>
            <td className="performance-table-percent"><PercentageBar proportion={proportion} /></td>
        </tr>
    }

    private onTabClear() {
        this.setState({ tab: null });
    }
}

export default ReactRedux.connect(stateToProps)(PerformancePanel);