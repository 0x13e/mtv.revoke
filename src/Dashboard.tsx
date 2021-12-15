import { Signer, providers } from 'ethers'
import React, { Component, ReactNode, ChangeEvent } from 'react'
import BootstrapSwitchButton from 'bootstrap-switch-button-react'
import { TokenMapping, TokenStandard } from './common/interfaces'
import { getFullTokenMapping, isSupportedNetwork } from './common/util'
import Erc20TokenList from './ERC20/Erc20TokenList'
import Erc721TokenList from './ERC721/Erc721TokenList'

type Props = {
  provider: providers.Provider
  chainId: number,
  signer?: Signer
  signerAddress?: string
  inputAddress?: string
}

type State = {
  filterRegisteredTokens: boolean
  filterZeroBalances: boolean
  tokenStandard: TokenStandard
  loading: boolean
  tokenMapping?: TokenMapping
}

class Dashboard extends Component<Props, State> {
  state: State = {
    tokenStandard: 'ERC20',
    filterRegisteredTokens: true,
    filterZeroBalances: false,
    loading: true,
  }

  componentDidMount() {
    this.loadData()
  }

  async loadData() {
    const tokenMapping = await getFullTokenMapping(this.props.chainId)
    this.setState({ tokenMapping, loading: false })
  }

  handleRegisteredCheckboxChange = (event: ChangeEvent<HTMLInputElement>) =>
    this.setState({ filterRegisteredTokens: event.target.checked })

  handleZeroBalancesCheckboxChange = (event: ChangeEvent<HTMLInputElement>) =>
    this.setState({ filterZeroBalances: event.target.checked })

  render(): ReactNode {
    if (!isSupportedNetwork(this.props.chainId)) {
      return (
        <div style={{ paddingBottom: 10 }}>
          Network with chainId {this.props.chainId} is not supported`
        </div>
      )
    }

    return (
      <div className="Dashboard">
      <div className="controlDiv">
        <div className="checkSwitches">
            {this.renderSelectionSwitch()}
        </div>
        <div className="registrationCheckbox">
            {this.renderRegistrationCheckbox()}
        </div>
      </div>
      {this.renderErc20TokenList()}
      </div>
    )
  }

  renderSelectionSwitch() {
    return (
      <div className="tokenSwitch" style={{ marginBottom: '10px' }}>
        <BootstrapSwitchButton
          checked={this.state.tokenStandard === 'ERC20'}
          onlabel='MRC20'
          offlabel='MRC721'
          onstyle="primary"
          offstyle="primary"
          width={100}
          onChange={(checked: boolean) => this.updateTokenStandard(checked)}
        />
      </div>
    )
  }

  updateTokenStandard(checked: boolean) {
    if (checked) {
      this.setState({ tokenStandard: 'ERC20' })
    } else {
      this.setState({ tokenStandard: 'ERC721' })
    }
  }

  renderRegistrationCheckbox() {
    // Don't check registration for NFTs
    if (this.state.tokenStandard === 'ERC721') return;

    // If no token data mapping is found and we're not on ETH, we hide the checkbox
    if (!this.state.tokenMapping && this.props.chainId !== 1) return

    // Link to Kleros T2CR for Ethereum or tokenlists for other chains
    const infoLink = this.props.chainId === 1
      ? 'https://tokens.kleros.io/tokens'
      : 'https://tokenlists.org/'

    return (
      <div>
        Filter out unregistered tokens
        <sup><a href={infoLink} target="_blank" rel="noopener noreferrer">?</a></sup>
        <input type="checkbox" checked={this.state.filterRegisteredTokens} onChange={this.handleRegisteredCheckboxChange} />
      </div>
    )
  }

  renderZeroBalancesCheckbox() {
    return (
      <div className="zeroBalances">
        <span style={{ marginRight: 5 }}>Filter out zero balances</span>
        <input type="checkbox" checked={this.state.filterZeroBalances} onChange={this.handleZeroBalancesCheckboxChange} />
      </div>
    )
  }

  renderErc20TokenList() {
    if (!this.props.inputAddress || this.state.loading) {
      return null;
    }

    if (this.state.tokenStandard === 'ERC20') {
      return (
        <Erc20TokenList
          provider={this.props.provider}
          chainId={this.props.chainId}
          signer={this.props.signer}
          signerAddress={this.props.signerAddress}
          inputAddress={this.props.inputAddress}
          filterRegisteredTokens={this.state.filterRegisteredTokens}
          filterZeroBalances={this.state.filterZeroBalances}
          tokenMapping={this.state.tokenMapping}
        />
      );
    } else {
      return (
        <Erc721TokenList
          provider={this.props.provider}
          chainId={this.props.chainId}
          signer={this.props.signer}
          signerAddress={this.props.signerAddress}
          inputAddress={this.props.inputAddress}
          filterRegisteredTokens={this.state.filterRegisteredTokens}
          filterZeroBalances={this.state.filterZeroBalances}
          tokenMapping={this.state.tokenMapping}
        />
      );
    }
  }
}

export default Dashboard
