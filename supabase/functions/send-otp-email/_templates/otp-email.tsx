import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface OtpEmailProps {
  token: string
}

export const OtpEmail = ({ token }: OtpEmailProps) => (
  <Html>
    <Head />
    <Preview>Your Login Code for Municipal Portal</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h2}>Your Login Code</Heading>
        <Text style={text}>Hi there!</Text>
        <Text style={text}>
          Here's your 6-digit verification code to login to Municipal Portal:
        </Text>
        <div style={codeContainer}>
          <Text style={codeText}>{token}</Text>
        </div>
        <Text style={text}>This code will expire in 60 minutes.</Text>
        <Text style={text}>
          If you didn't request this code, you can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          <small>
            You're receiving this email because you signed up for Municipal Portal.
          </small>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default OtpEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h2 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
}

const codeContainer = {
  background: '#f5f5f5',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '24px 0',
}

const codeText = {
  fontSize: '32px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  margin: '0',
  color: '#333',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
}