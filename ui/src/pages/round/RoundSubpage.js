import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { roomServiceSocketSelector } from '../../data/state/room-service/room-service.selectors'
import {
  createRoomServiceConnection,
  emitEvent,
} from '../../data/state/room-service/room-service.actions'
import { StyleSheet, css } from 'aphrodite'
import { useParams } from 'react-router-dom'
import { displayNameSelector } from '../../data/state/app-data/app-data.selector'
import { roomConfigSelector } from '../../data/state/room-config/room-config.selector'
import { roundStateSelector } from '../../data/state/round-state/round-state.selector'
import DisplayCard from '../../components/round/DisplayCard'
import CardGrid from '../../components/CardGrid'
import GameState from '../../services/GameState'
import { Dialog, Typography, Button, Paper, Container } from '@material-ui/core'
import RickRolled from '../../components/round/RickRolled'
import MemberRow from '../../components/round/MemberRow'
import MemberList from '../../components/round/MemberList'
import DesktopView from '../../components/round/DesktopView'
import { useMediaQuery } from '@material-ui/core'
import MobileView from '../../components/round/MobileView'
import ResultsList from '../../components/round/ResultsList'
import PropTypes from 'prop-types'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import CssBaseline from '@material-ui/core/CssBaseline'
import useScrollTrigger from '@material-ui/core/useScrollTrigger'
import Box from '@material-ui/core/Box'
import Slide from '@material-ui/core/Slide'
import userImg from '../../components/icon/logowhite.svg'
import IconButton from '@material-ui/core/IconButton'
import Grid from '@material-ui/core/Grid'
import Divider from '@material-ui/core/Divider'
import { Link } from 'react-router-dom'

function HideOnScroll(props) {
  const { children, window } = props
  // Note that you normally won't need to set the window ref as useScrollTrigger
  // will default to window.
  // This is only being set here because the demo is in an iframe.
  const trigger = useScrollTrigger({ target: window ? window() : undefined })

  return (
    <Slide appear={false} direction='down' in={!trigger}>
      {children}
    </Slide>
  )
}

HideOnScroll.propTypes = {
  children: PropTypes.element.isRequired,
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  window: PropTypes.func,
}

const RoundSubpage = ({
  createRoomServiceConnection,
  displayName,
  roomConfig,
  roundState,
  roomServiceSocket,
  emitEvent,
  ...thruProps
}) => {
  const { username } = useParams()
  const isDesktop = useMediaQuery('(min-width:600px)')

  const renderBiddingPhase = () => {
    const picked = roundState.voteByUserID[roomServiceSocket.id]
    const cardUi = roundState.deck.map((it, idx) => (
      <DisplayCard
        key={it.number}
        card={it}
        selected={idx == picked}
        onClick={() => {
          emitEvent('user_vote', {
            roomID: username,
            cardIndex: idx,
          })
        }}
      />
    ))
    const voted = Object.values(roundState.connectedUsersByID).filter(
      ({ socketID }) => roundState.voteByUserID[socketID] != null
    ).length
    const total = Object.values(roundState.connectedUsersByID).length

    return (
      <>
        <RickRolled />
        <HideOnScroll fullWidth>
          <AppBar position='fixed' className={styles.appBar}>
            <Toolbar
              style={{
                width: '80%',
                display: 'flex',
                justifyContent: 'space-between',
              }}
              noWrap
            >
              <Button
                component={Link}
                to={'/'}
                // fontSize='small'

                style={{
                  //   paddingTop: '16px',
                  //   paddingBottom: '8px',
                  color: '#fff',
                  //   font: "'Reem Kufi', sans-serif",
                }}
              >
                <img src={userImg} style={{ height: '30px' }} />
                <Typography
                  variant='h6'
                  style={{
                    paddingTop: '16px',
                    paddingBottom: '8px',
                    textIndent: '0.5em',
                    textTransform: 'none',
                  }}
                >
                  PilePlan
                </Typography>
              </Button>

              <div>
                <Typography variant='h6'>PICK YOUR CARD</Typography>
              </div>
              <div>k</div>
            </Toolbar>
          </AppBar>
        </HideOnScroll>
        <Toolbar />
        <MemberList className={css(styles.container)} />
        {isDesktop ? (
          <DesktopView
            // header={
            //   <Paper square>
            //     <Typography variant='h2'>Place your bid</Typography>
            //   </Paper>
            // }
            primary={
              <CardGrid className={css(styles.cardArea)}>{cardUi}</CardGrid>
            }
            // secondary={<MemberList className={css(styles.container)} />}
          />
        ) : (
          <MobileView
            primary={<CardGrid>{cardUi}</CardGrid>}
            secondary={<MemberList />}
            buttonText={`${voted}/${total}`}
          />
        )}
      </>
    )
  }

  const renderResultsPhase = () => {
    return (
      <Container>
        <Paper>
          <Typography
            variant='h2'
            color='primary'
            align='center'
            style={{ paddingTop: 10, marginBottom: 24 }}
          >
            Results
          </Typography>
          <Button
            onClick={() => {
              emitEvent('start_new_round', { roomID: username })
            }}
          >
            Next Round
          </Button>
        </Paper>
        <Grid container spacing={3} style={{ marginTop: 18 }}>
          <Grid item xs>
            <Paper style={{ padding: 12 }}>
              <div>
                <Typography variant='h4' color='primary' align='center'>
                  Statistics
                </Typography>
                <Divider />
                <Typography>Average</Typography>
                <Typography>Median</Typography>
                <Typography>Standard Deviation</Typography>
              </div>
            </Paper>
          </Grid>
          <Grid item xs>
            Most picked card
          </Grid>
          <Grid item xs>
            <ResultsList />
          </Grid>
        </Grid>
      </Container>
    )
  }

  return (
    <>
      <RickRolled rickRollPlaying={true} />
      {roundState.phase === 'RESULTS_PHASE'
        ? renderResultsPhase()
        : renderBiddingPhase()}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 12,
  },
  cardArea: {
    padding: 12,
  },
  appBar: {},
})

const mapStateToProps = (state) => {
  return {
    roomServiceSocket: roomServiceSocketSelector(state),
    displayName: displayNameSelector(state),
    roundState: roundStateSelector(state),
    roomConfig: roomConfigSelector(state),
  }
}

const mapDispatchToProps = {
  createRoomServiceConnection,
  emitEvent,
}

export default connect(mapStateToProps, mapDispatchToProps)(RoundSubpage)
