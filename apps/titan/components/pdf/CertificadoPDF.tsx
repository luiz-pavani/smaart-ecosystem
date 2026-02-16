'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

// Estilos do PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: '3px solid #16A34A',
    paddingBottom: 15
  },
  logoContainer: {
    width: 80,
    height: 80
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  federacaoInfo: {
    flex: 1,
    marginLeft: 20,
    textAlign: 'center'
  },
  federacaoNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
    marginBottom: 4
  },
  federacaoSigla: {
    fontSize: 12,
    color: '#666666'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#16A34A',
    marginTop: 30,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 30
  },
  certificadoNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#DC2626',
    marginBottom: 30,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 4
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#16A34A',
    marginBottom: 10,
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: 5
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    width: 120
  },
  infoValue: {
    fontSize: 10,
    color: '#6B7280',
    flex: 1
  },
  declaracao: {
    fontSize: 11,
    lineHeight: 1.6,
    textAlign: 'justify',
    color: '#374151',
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderLeft: '3px solid #16A34A'
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 30,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 8
  },
  qrCode: {
    width: 120,
    height: 120,
    marginBottom: 10
  },
  qrText: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4
  },
  qrUrl: {
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #E5E7EB',
    paddingTop: 10
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF'
  },
  validade: {
    textAlign: 'center',
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 4
  },
  validadeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16A34A'
  }
})

interface CertificadoPDFProps {
  certificado: {
    numero_certificado: string
    ano_validade: number
    data_emissao: string
    data_validade: string
    academia: {
      nome: string
      sigla?: string
      cnpj?: string
      logo_url?: string
      endereco_cidade?: string
      endereco_estado?: string
      responsavel_nome?: string
    }
    federacao: {
      nome: string
      sigla: string
      logo_url?: string
      endereco_cidade?: string
      endereco_estado?: string
    }
    url_validacao: string
  }
  qrCodeDataURL: string
}

export const CertificadoPDF: React.FC<CertificadoPDFProps> = ({ certificado, qrCodeDataURL }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header com logo da federação */}
        <View style={styles.header}>
          {certificado.federacao.logo_url && (
            <View style={styles.logoContainer}>
              <Image src={certificado.federacao.logo_url} style={styles.logo} />
            </View>
          )}
          <View style={styles.federacaoInfo}>
            <Text style={styles.federacaoNome}>{certificado.federacao.nome}</Text>
            <Text style={styles.federacaoSigla}>
              {certificado.federacao.endereco_cidade && certificado.federacao.endereco_estado && 
                `${certificado.federacao.endereco_cidade}/${certificado.federacao.endereco_estado}`
              }
            </Text>
          </View>
        </View>

        {/* Título */}
        <Text style={styles.title}>
          Certificado de Autorização de Funcionamento
        </Text>
        <Text style={styles.subtitle}>
          Ano de Validade: {certificado.ano_validade}
        </Text>

        {/* Número do certificado */}
        <Text style={styles.certificadoNumber}>
          Nº {certificado.numero_certificado}
        </Text>

        {/* Declaração */}
        <Text style={styles.declaracao}>
          A {certificado.federacao.nome} ({certificado.federacao.sigla}), no uso de suas atribuições 
          e em conformidade com os estatutos vigentes, CERTIFICA que a academia abaixo identificada 
          está devidamente FILIADA e AUTORIZADA a funcionar como entidade de prática de Judô 
          durante o ano de {certificado.ano_validade}, estando em dia com todas as obrigações 
          estatutárias e financeiras.
        </Text>

        {/* Dados da Academia */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DA ACADEMIA</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nome:</Text>
            <Text style={styles.infoValue}>{certificado.academia.nome}</Text>
          </View>
          {certificado.academia.sigla && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sigla:</Text>
              <Text style={styles.infoValue}>{certificado.academia.sigla}</Text>
            </View>
          )}
          {certificado.academia.cnpj && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CNPJ:</Text>
              <Text style={styles.infoValue}>{certificado.academia.cnpj}</Text>
            </View>
          )}
          {certificado.academia.endereco_cidade && certificado.academia.endereco_estado && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Localidade:</Text>
              <Text style={styles.infoValue}>
                {certificado.academia.endereco_cidade}/{certificado.academia.endereco_estado}
              </Text>
            </View>
          )}
          {certificado.academia.responsavel_nome && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Responsável:</Text>
              <Text style={styles.infoValue}>{certificado.academia.responsavel_nome}</Text>
            </View>
          )}
        </View>

        {/* Dados do Certificado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DO CERTIFICADO</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data de Emissão:</Text>
            <Text style={styles.infoValue}>{formatDate(certificado.data_emissao)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Válido até:</Text>
            <Text style={styles.infoValue}>{formatDate(certificado.data_validade)}</Text>
          </View>
        </View>

        {/* Validade */}
        <View style={styles.validade}>
          <Text style={styles.validadeText}>
            ✓ VÁLIDO ATÉ {formatDate(certificado.data_validade).toUpperCase()}
          </Text>
        </View>

        {/* QR Code para validação */}
        <View style={styles.qrSection}>
          <Image src={qrCodeDataURL} style={styles.qrCode} />
          <Text style={styles.qrText}>
            Escaneie o QR Code para validar este certificado
          </Text>
          <Text style={styles.qrUrl}>
            {certificado.url_validacao}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Documento gerado eletronicamente em {formatDate(new Date().toISOString())}
          </Text>
          <Text style={styles.footerText}>
            {certificado.numero_certificado}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
