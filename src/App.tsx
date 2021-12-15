import './App.scss'
import axios from 'axios'
import { Signer, providers } from 'ethers'
import { getAddress } from 'ethers/lib/utils'
import React, { Component, ReactNode, ChangeEvent } from 'react'
import Dashboard from './Dashboard'
import DonateButton from './DonateButton/DonateButton'
import { Button, Form, Container, Row, Col } from 'react-bootstrap'
import { lookupEnsName, shortenAddress } from './common/util'
import { displayGitcoinToast } from './common/gitcoin-toast';
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

declare let window: {
  ethereum?: any
  web3?: any
  location: any
}

type State = {
  provider?: providers.Provider,
  signer?: Signer,
  chainId?: number,
  signerAddress?: string,
  signerEnsName?: string,
  inputAddressOrName?: string,
  inputAddress?: string,
  showDonateModal: boolean,
}

class App extends Component<{}, State> {
  state: State = {
    showDonateModal: false,
  }

  async componentDidMount() {
    await this.connectProvider()

    // Connect with Web3 provider for WRITE operations if access is already granted
    if (window.ethereum || window.web3) {
      try {
        // Check if access is granted
        await this.connectSigner()
      } catch {} // ignored
    }

    // Refresh the page when changing the network in Metamask
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => window.location.reload(false))
      window.ethereum.on('accountsChanged', () => window.location.reload(false))
    }

    displayGitcoinToast();
  }

  async connectWeb3() {
    if (window.ethereum) {
      try {
        // Request account access if needed
        await window.ethereum.request({ method: 'eth_requestAccounts' })
      } catch {
        // User denied account access...
        return
      }
    }

    await this.connectSigner()
  }

  async connectProvider() {
    if (window.ethereum) {
      const provider = new providers.Web3Provider(window.ethereum)
      await this.updateProvider(provider)
      console.log('Using injected "window.ethereum" provider')
    } else if (window.web3 && window.web3.currentProvider) {
      const provider = new providers.Web3Provider(window.web3.currentProvider)
      await this.updateProvider(provider)
      console.log('Using injected "window.web3" provider')
    } else {
      try {
        // Use a default provider with a free Infura key if web3 is not available
        const provider = new providers.InfuraProvider('mainnet', `${'88583771d63544aa'}${'ba1006382275c6f8'}`)

        // Check that the provider is available (and not rate-limited) by sending a dummy request
        const dummyRequest = '{"method":"eth_getCode","params":["0x1f9840a85d5af5bf1d1762f925bdaddc4201f984","latest"],"id":0,"jsonrpc":"2.0"}'
        await axios.post(provider.connection.url, dummyRequest)
        await this.updateProvider(provider)
        console.log('Using fallback Infura provider')
      } catch {
        console.log('No web3 provider available')
      }
    }
  }

  async updateProvider(provider: providers.Provider) {
    const { chainId } = await provider.getNetwork()

    // Add a hacky patch to make sure that for Matic we talk to this RPC endpoint
    // regardless of what is configured in MM since the Matic Vigil endpoint has limited
    // historic logs.
    // TODO: Do this in a non-hacky way later
    if (chainId === 137) {
      provider = new providers.WebSocketProvider('wss://rpc-mainnet.matic.quiknode.pro');
    }

    this.setState({ provider, chainId })
  }

  async connectSigner() {
    if (!window.ethereum && !window.web3) {
      alert('Please use a web3 enabled browser to use mtv.revoke')
      return
    }

    // Retrieve signer from injected provider
    const injectedProvider = window.ethereum ?? window.web3.currentProvider
    const provider = new providers.Web3Provider(injectedProvider)
    const signer = provider.getSigner()

    // Retrieve signer address and ENS name
    const signerAddress = await signer.getAddress()
    const signerEnsName = await lookupEnsName(signerAddress, provider)

    // Prepopulate the input address or ENS name (if they aren't populated yet)
    const inputAddressOrName = this.state.inputAddressOrName || signerEnsName || signerAddress
    const inputAddress = await this.parseInputAddress(inputAddressOrName)

    this.setState({ signer, signerAddress, signerEnsName, inputAddressOrName, inputAddress })
  }

  async handleInputAddressChanged(event: ChangeEvent<HTMLInputElement>) {
    // Update input value
    const inputAddressOrName = event.target.value
    this.setState({ inputAddressOrName })

    // Update input address if it is valid
    const inputAddress = await this.parseInputAddress(inputAddressOrName)
    if (inputAddress) {
      this.setState({ inputAddress })
    }
  }

  async parseInputAddress(inputAddressOrName: string): Promise<string | undefined> {
    // If no provider is set, this means that the browser is not web3 enabled
    // and the fallback Infura provider is currently rate-limited
    if (!this.state.provider) {
      alert('Please use a web3 enabled browser to use revoke.cash')
      this.setState({ inputAddressOrName: undefined })
      return
    }

    // If the input is an ENS name, validate it, resolve it and return it
    if (inputAddressOrName.endsWith('.eth')) {
      try {
        const address = await this.state.provider.resolveName(inputAddressOrName)
        return address ? address : undefined
      } catch {
        return undefined
      }
    }

    // If the input is an address, validate it and return it
    try {
      return getAddress(inputAddressOrName)
    } catch {
      return undefined
    }
  }

  render(): ReactNode {
    return (
      <Container fluid className="App">
        {this.renderHeader()}
        {this.renderAddressInput()}
        {this.renderTokenList()}
        {this.renderFooter()}
        {this.renderToastContainer()}
      </Container>
    )
  }

  renderHeader() {
    return (
      <Row className="Header">
        <Col className="my-auto"><img className="logo" src="revoke.svg" alt="mtv.revoke.ac logo"/></Col>
      </Row>
    )
  }

  renderDonateButton() {
    if(!this.state.chainId) return
    return <DonateButton signer={this.state.signer} chainId={this.state.chainId} />
  }

  renderConnectButton() {
    const text = this.state.signerAddress
      ? this.state.signerEnsName || shortenAddress(this.state.signerAddress)
      : 'Connect web3'

    return (
      <Button style={{ border: '1px solid white' }} variant="primary" onClick={() => this.connectWeb3()}>{text}</Button>
    )
  }

  renderAddressInput() {

  const text = this.state.signerAddress
    ? this.state.signerEnsName || this.state.signerAddress
    : 'Connect web3'

    return (
      <Row className="AddressRow">
        <Col className="my-auto" lg="6" md="12" sm="12">
          <Button className="web3Button my-auto AddressInput text-center" style={{width:'100%'}} onClick={() => this.connectWeb3()}>{text}</Button>
        </Col>
      </Row>
    )
  }

  renderTokenList() {
    if (!this.state.inputAddress) return

    return (<Dashboard
      provider={this.state.provider}
      chainId={this.state.chainId}
      signer={this.state.signer}
      signerAddress={this.state.signerAddress}
      inputAddress={this.state.inputAddress}
    />)
  }

  renderFooter() {
    return (
      <div className="footer">
        <p>Forked from <a href="https://kalis.me/">Rosco Kalis's</a> (<a href="https://github.com/rkalis/revoke.cash">revoke.cash</a>)<br/>Please consider donating to him if you find this useful</p>
      </div>
    )
  }

  renderToastContainer() {
    return (
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    )
  }
}

export default App
