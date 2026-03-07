import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

interface CertificadoFiliacaoProps {
  academia: {
    nome: string
    sigla: string | null
    cnpj: string | null
    endereco_rua: string | null
    endereco_numero: string | null
    endereco_bairro: string | null
    endereco_cidade: string | null
    endereco_estado: string | null
    endereco_cep: string | null
    responsavel_nome: string | null
  }
  federacao: {
    nome_completo: string
    sigla: string | null
    cnpj: string | null
  }
  dataEmissao: string
  numeroRegistro: string
}

const styles = StyleSheet.create({
  page: {
    padding: 60,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
    borderBottom: 3,
    borderBottomColor: '#1e40af',
    paddingBottom: 20,
  },
  federacaoNome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
    textAlign: 'center',
  },
  federacaoSubtitulo: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 10,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  subtitulo: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    color: '#475569',
  },
  conteudo: {
    marginTop: 20,
    marginBottom: 40,
    lineHeight: 1.8,
  },
  paragrafo: {
    fontSize: 12,
    textAlign: 'justify',
    marginBottom: 15,
    color: '#334155',
    lineHeight: 1.6,
  },
  destaque: {
    fontWeight: 'bold',
    color: '#1e40af',
  },
  dadosAcademia: {
    marginTop: 20,
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    border: 1,
    borderColor: '#cbd5e1',
  },
  campoLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  campoValor: {
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  divisor: {
    marginTop: 10,
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  assinatura: {
    marginTop: 50,
    alignItems: 'center',
  },
  linhaAssinatura: {
    width: 250,
    borderTop: 1,
    borderTopColor: '#0f172a',
    marginBottom: 8,
  },
  textoAssinatura: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
  },
  rodape: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    paddingTop: 15,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
  },
  rodapeTexto: {
    fontSize: 9,
    color: '#94a3b8',
    textAlign: 'center',
  },
  numeroRegistro: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  selo: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#dbeafe',
    borderRadius: 50,
    width: 100,
    height: 100,
    alignSelf: 'center',
    justifyContent: 'center',
    border: 2,
    borderColor: '#1e40af',
  },
  seloTexto: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
  },
})

export const CertificadoFiliacao = ({ 
  academia, 
  federacao, 
  dataEmissao,
  numeroRegistro 
}: CertificadoFiliacaoProps) => {
  const enderecoCompleto = [
    academia.endereco_rua,
    academia.endereco_numero,
    academia.endereco_bairro,
    academia.endereco_cidade,
    academia.endereco_estado,
    academia.endereco_cep
  ].filter(Boolean).join(', ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.federacaoNome}>{federacao.nome_completo}</Text>
          <Text style={styles.federacaoSubtitulo}>
            {federacao.sigla && `${federacao.sigla} • `}
            {federacao.cnpj && `CNPJ: ${federacao.cnpj}`}
          </Text>
        </View>

        {/* Selo de Autenticidade */}
        <View style={styles.selo}>
          <Text style={styles.seloTexto}>AUTÊNTICO</Text>
          <Text style={[styles.seloTexto, { fontSize: 8, marginTop: 5 }]}>
            {new Date(dataEmissao).getFullYear()}
          </Text>
        </View>

        {/* Título */}
        <Text style={styles.titulo}>Certificado de Filiação</Text>
        <Text style={styles.subtitulo}>e Autorização de Funcionamento</Text>

        {/* Conteúdo */}
        <View style={styles.conteudo}>
          <Text style={styles.paragrafo}>
            A <Text style={styles.destaque}>{federacao.nome_completo}</Text>, 
            no uso de suas atribuições legais e regulamentares, vem por meio deste 
            documento <Text style={styles.destaque}>CERTIFICAR</Text> que:
          </Text>

          {/* Dados da Academia */}
          <View style={styles.dadosAcademia}>
            <Text style={styles.campoLabel}>Academia</Text>
            <Text style={styles.campoValor}>
              {academia.nome} {academia.sigla && `(${academia.sigla})`}
            </Text>

            {academia.cnpj && (
              <>
                <Text style={styles.campoLabel}>CNPJ</Text>
                <Text style={styles.campoValor}>{academia.cnpj}</Text>
              </>
            )}

            {academia.responsavel_nome && (
              <>
                <Text style={styles.campoLabel}>Responsável</Text>
                <Text style={styles.campoValor}>{academia.responsavel_nome}</Text>
              </>
            )}

            {enderecoCompleto && (
              <>
                <Text style={styles.campoLabel}>Endereço</Text>
                <Text style={styles.campoValor}>{enderecoCompleto}</Text>
              </>
            )}
          </View>

          <Text style={styles.paragrafo}>
            Encontra-se devidamente <Text style={styles.destaque}>FILIADA</Text> e 
            em situação regular junto a esta federação, estando <Text style={styles.destaque}>AUTORIZADA</Text> a 
            funcionar e representar a modalidade de Judô, podendo participar de eventos, 
            competições e demais atividades organizadas sob a supervisão desta entidade.
          </Text>

          <Text style={styles.paragrafo}>
            A academia filiada compromete-se a seguir os regulamentos, normas técnicas 
            e código de ética estabelecidos pela federação, bem como manter seus atletas 
            e instrutores devidamente registrados e em dia com suas obrigações.
          </Text>

          <Text style={styles.paragrafo}>
            Este certificado é válido enquanto perdurar a filiação e o cumprimento 
            das obrigações estatutárias e regulamentares.
          </Text>
        </View>

        {/* Data de Emissão */}
        <Text style={{ fontSize: 11, textAlign: 'center', marginBottom: 5, color: '#475569' }}>
          Emitido em {new Date(dataEmissao).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          })}
        </Text>

        {/* Assinatura */}
        <View style={styles.assinatura}>
          <View style={styles.linhaAssinatura} />
          <Text style={styles.textoAssinatura}>{federacao.nome_completo}</Text>
          <Text style={[styles.textoAssinatura, { fontSize: 9, marginTop: 3 }]}>
            Presidente da Federação
          </Text>
        </View>

        {/* Número de Registro */}
        <Text style={styles.numeroRegistro}>
          Registro: {numeroRegistro}
        </Text>

        {/* Rodapé */}
        <View style={styles.rodape}>
          <Text style={styles.rodapeTexto}>
            Este documento foi gerado eletronicamente e possui validade jurídica.
          </Text>
          <Text style={[styles.rodapeTexto, { marginTop: 3, fontSize: 8 }]}>
            Para validar a autenticidade deste certificado, entre em contato com a federação.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
